# Design Document — Bullish Stock Predictor

## Overview

The Bullish Stock Predictor is a full-stack MVP that accepts a comma-separated list of BSE/NSE tickers, fetches one year of OHLCV history via **yfinance**, computes five technical-indicator sub-scores, ranks all scored stocks (frontend paginates at 10/page), and surfaces the results through a React + AWS Cloudscape frontend backed by a FastAPI service.

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
│  ┌──────────────┐   ┌──────────────────────┐  ┌──────────────┐  │
│  │  TickerInput │   │  AnalysisPage.jsx     │  │ StockDetail  │  │
│  │  Component   │──▶│  (Cloudscape Table)   │─▶│ Drawer.jsx   │  │
│  └──────────────┘   └──────────────────────┘  └──────────────┘  │
└────────────────────────────│────────────────────────────────────┘
                             │ HTTP/JSON (CORS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend  (src/api/)                    │
│  ┌────────────────────────┐   ┌──────────────────────────────┐  │
│  │  POST /api/v1/analyze  │   │  GET /api/v1/ticker/{ticker} │  │
│  └────────────┬───────────┘   └──────────────┬───────────────┘  │
│               │                               │                  │
│               ▼                               ▼                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               In-Memory Session Cache (dict)             │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │ cache miss                         │
│               ┌─────────────▼────────────┐                      │
│               │  AnalysisOrchestrator     │                      │
│               │  (src/api/routes/)        │                      │
│               └──┬──────────┬────────────┘                      │
│                  │          │                                     │
│         ┌────────▼──┐  ┌───▼────────────────┐                   │
│         │DataFetcher│  │IndicatorCalculator  │                   │
│         │(src/data/)│  │(src/features/)      │                   │
│         └────────┬──┘  └───┬────────────────┘                   │
│                  │ OHLCV   │ indicators dict                     │
│                  │         ▼                                     │
│                  │  ┌──────────────────┐                         │
│                  └─▶│  BullishScorer   │                         │
│                     │  (src/models/)   │                         │
│                     └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    yfinance  (external)
```


---

## Component Diagram

```
src/
├── api/
│   ├── main.py                  # FastAPI app factory, CORS, lifespan
│   └── routes/
│       ├── analyze.py           # POST /api/v1/analyze
│       └── ticker.py            # GET  /api/v1/ticker/{ticker}
├── data/
│   └── fetch_market_data.py     # DataFetcher — yfinance wrapper
├── features/
│   └── indicator_calculator.py  # IndicatorCalculator — RSI/MACD/BB/SMA/Vol
└── models/
    └── bullish_scorer.py        # BullishScorer — sub-scores + ranking

frontend/
├── src/
│   ├── pages/
│   │   └── AnalysisPage.jsx       # Main view: input + stat cards + results table
│   ├── components/
│   │   ├── AppHeader.jsx           # Sticky TopNavigation — branding + market chip + theme toggle
│   │   ├── TickerInputForm.jsx     # Cloudscape Form + multiselect/textarea + quick-load preset
│   │   ├── StockDetailDrawer.jsx   # Wide Cloudscape Drawer — sub-scores + chart + range bar
│   │   ├── StatCard.jsx            # Single summary stat card (count / mean)
│   │   ├── SignalDots.jsx          # 5 coloured dots for RSI/MACD/BB/MA/Volume signals
│   │   ├── ScoreProgressBar.jsx    # Cloudscape ProgressBar wrapper with colour-coded fill
│   │   ├── SparklineCell.jsx       # Inline 80×30 Recharts sparkline for 30-day close trend
│   │   └── FailedTickersBanner.jsx # Expandable section listing failed tickers + reasons
│   ├── api/
│   │   └── stockApi.js             # Axios/fetch wrappers for backend
│   └── App.jsx
├── package.json
└── vite.config.js
```

---

## Data Flow

### Analysis Request (POST /api/v1/analyze)

```
1. User types tickers  →  TickerInputForm trims + deduplicates
2. Frontend sends      →  POST /api/v1/analyze  { "tickers": ["RELIANCE.NS", ...] }
3. API validates       →  each ticker: non-empty, ≤ 20 chars
4. For each ticker     →  DataFetcher.fetch(ticker)  →  DataFrame (1yr OHLCV)
   └─ < 50 rows        →  mark "insufficient_data", skip
   └─ exception        →  mark "failed", skip, log error
5. For each valid df   →  IndicatorCalculator.compute(df)  →  IndicatorSet
6. For each IndicatorSet → BullishScorer.score(indicators)  →  ScoredTicker
7. Sort desc by score  →  return all sorted
8. Store in cache      →  session_cache[ticker] = ScoredTicker
9. Return JSON         →  { "results": [...all sorted...], "failed": [...] }
```

### Detail Request (GET /api/v1/ticker/{ticker})

```
1. Look up ticker in session_cache
   └─ miss  →  HTTP 404
   └─ hit   →  return ScoredTicker + last 90 days OHLCV
```

---

## Key Data Models (Python dataclasses)

> **Implementation Note:** All models below are implemented as **Pydantic v2 BaseModel** classes in `src/api/models.py`, not Python dataclasses. The dataclass notation here is used for brevity.

```python
@dataclass
class OHLCVData:
    ticker: str
    df: pd.DataFrame          # columns: Open, High, Low, Close, Volume; index: Date

@dataclass
class IndicatorSet:
    ticker: str
    rsi: float                # latest RSI(14) value
    macd_line: float
    macd_signal: float
    macd_histogram: float
    macd_histogram_prev: float
    bb_upper: float
    bb_middle: float          # 20-SMA
    bb_lower: float
    sma_50: float
    sma_200: float
    ema_20: float
    vol_5d_avg: float
    vol_20d_avg: float
    last_close: float
    log_return_std_30: float  # std of daily log returns, last 30 days

@dataclass
class SubScores:
    rsi: int          # 0 | 10 | 15 | 20
    macd: int         # 0 | 12 | 20
    bollinger: int    # 0 | 6  | 12 | 20
    moving_avg: int   # 0 | 10 | 20
    volume: int       # 0 | 10 | 20

@dataclass
class ScoredTicker:
    ticker: str
    bullish_score: int          # 0-100
    confidence: str             # "Low" | "Medium" | "High"
    sub_scores: SubScores
    rsi_value: float
    macd_signal_label: str      # "bullish" | "neutral" | "bearish"
    bb_signal_label: str        # "oversold" | "neutral" | "overbought"
    ma_signal_label: str        # "golden_cross" | "above_ma" | "below_ma"
    volume_signal_label: str    # "high" | "normal" | "low"
    projected_lower: float
    projected_upper: float
    ohlcv_90d: list[dict]       # last 90 rows as JSON-serialisable dicts

@dataclass
class AnalyzeRequest:
    tickers: list[str]          # 1..500 items

@dataclass
class AnalyzeResponse:
    results: list[ScoredTicker] # all scored, sorted desc by bullish_score
    failed: list[dict]          # [{"ticker": "X", "reason": "..."}]
```


---

## Module Signatures

### `src/api/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def create_app() -> FastAPI:
    """Factory that wires up CORS, routes, and the in-memory session cache."""
    ...

app = create_app()
```

### `src/api/routes/analyze.py`

```python
from fastapi import APIRouter
from src.api.models import AnalyzeRequest, AnalyzeResponse

router = APIRouter()

@router.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    1. Validate tickers (non-empty, ≤ 20 chars, 1-500 items).
    2. Fetch OHLCV, compute indicators, score each ticker.
    3. Sort all scored results, store in cache, return results + failed list.
    Raises HTTP 422 if all tickers fail validation or data fetch.
    """
    ...
```

### `src/api/routes/ticker.py`

```python
from fastapi import APIRouter, HTTPException
from src.api.models import ScoredTicker

router = APIRouter()

@router.get("/api/v1/ticker/{ticker}", response_model=ScoredTicker)
async def get_ticker(ticker: str) -> ScoredTicker:
    """
    Look up ticker in session cache.
    Raises HTTP 404 if ticker has not been analysed yet.
    """
    ...
```

### `src/data/fetch_market_data.py`

```python
import pandas as pd
from dataclasses import dataclass

@dataclass
class FetchResult:
    ticker: str
    status: str           # "ok" | "insufficient_data" | "failed"
    df: pd.DataFrame | None
    error: str | None

def apply_exchange_suffix(ticker: str) -> str:
    """
    Return ticker unchanged if it already ends with .NS or .BO.
    The caller passes pre-suffixed symbols; this is a pass-through guard.
    """
    ...

def fetch_ticker(ticker: str, period: str = "1y") -> FetchResult:
    """
    Download daily OHLCV data for a single ticker via yfinance.
    Returns FetchResult with status="insufficient_data" if fewer than 50 rows.
    Returns FetchResult with status="failed" on any yfinance exception.
    """
    ...

def fetch_batch(tickers: list[str]) -> list[FetchResult]:
    """
    Fetch all tickers sequentially (ThreadPoolExecutor deferred to MVP1b).
    Returns one FetchResult per ticker regardless of individual failures.
    """
    ...
```

### `src/features/indicator_calculator.py`

```python
import pandas as pd
from src.api.models import IndicatorSet

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Wilder's smoothed RSI. Output values are always in [0, 100]."""
    ...

def compute_macd(
    close: pd.Series,
    fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (macd_line, signal_line, histogram). macd_line = fast_ema - slow_ema."""
    ...

def compute_bollinger_bands(
    close: pd.Series, period: int = 20, num_std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (upper, middle, lower). upper > middle > lower for any valid window."""
    ...

def compute_sma(close: pd.Series, period: int) -> pd.Series:
    """Rolling simple moving average. Each value is within [min, max] of the window."""
    ...

def compute_ema(close: pd.Series, period: int) -> pd.Series:
    """Exponential moving average."""
    ...

def compute_volume_trend(volume: pd.Series) -> tuple[float, float]:
    """Returns (avg_5d, avg_20d) of daily volume."""
    ...

def compute_indicators(df: pd.DataFrame, ticker: str) -> IndicatorSet:
    """
    Top-level orchestrator. Calls all compute_* functions and packages
    their latest values into an IndicatorSet dataclass.
    Requires df to have columns: Open, High, Low, Close, Volume.
    """
    ...
```

### `src/models/bullish_scorer.py`

```python
from src.api.models import IndicatorSet, SubScores, ScoredTicker

def score_rsi(rsi: float) -> int:
    """
    Piecewise mapping:
      rsi < 30        → 20
      30 <= rsi <= 50 → 15
      50 < rsi <= 70  → 10
      rsi > 70        → 0
    """
    ...

def score_macd(macd_line: float, signal: float, hist: float, hist_prev: float) -> int:
    """
    Piecewise mapping:
      macd > signal AND hist > 0 AND hist > hist_prev → 20
      macd > signal                                   → 12
      macd <= signal                                  → 0
    """
    ...

def score_bollinger(close: float, upper: float, middle: float, lower: float) -> int:
    """
    Piecewise mapping:
      close < lower           → 20
      lower <= close < middle → 12
      middle <= close < upper → 6
      close >= upper          → 0
    """
    ...

def score_moving_average(close: float, sma_50: float, sma_200: float) -> int:
    """
    Piecewise mapping:
      sma_50 > sma_200                          → 20  (Golden Cross)
      close > sma_50 AND NOT golden cross       → 10
      else                                      → 0
    """
    ...

def score_volume(vol_5d: float, vol_20d: float) -> int:
    """
    Piecewise mapping:
      vol_5d > vol_20d * 1.20  → 20
      vol_5d >= vol_20d * 0.80 → 10
      vol_5d < vol_20d * 0.80  → 0
    """
    ...

def derive_confidence(score: int) -> str:
    """75-100 → 'High'  |  50-74 → 'Medium'  |  0-49 → 'Low'"""
    ...

def compute_projected_range(
    last_close: float, log_return_std_30: float
) -> tuple[float, float]:
    """
    lower = last_close × (1 − annualised_vol × √(30/252))
    upper = last_close × (1 + annualised_vol × √(30/252))
    where annualised_vol = log_return_std_30 × √252
    """
    ...

def score_ticker(indicators: IndicatorSet, ohlcv_90d: list[dict]) -> ScoredTicker:
    """Assembles all sub-scores into a ScoredTicker. Total score is in [0, 100]."""
    ...

def rank_tickers(scored: list[ScoredTicker]) -> list[ScoredTicker]:
    """Sort descending by bullish_score; return all sorted descending."""
    ...
```


---

## Frontend Component Design

### `App.jsx`

```jsx
// Imports Cloudscape global styles once.
// Applies initial theme mode via applyMode() from @cloudscape-design/global-styles.
// State: colorMode ('light' | 'dark')
// Renders:
//   <AppLayout>          — Cloudscape root shell (navigation, content, tools panels)
//     <AppHeader>        — sticky TopNavigation with branding + theme toggle
//     <ContentLayout>    — wraps the main page content
//       <AnalysisPage>   — the single page of the SPA
```

### `AppHeader.jsx`

```jsx
// Props: colorMode ('light'|'dark'), onToggleMode ()=>void
// Renders a Cloudscape <TopNavigation> (sticky, position="sticky") with:
//   - identity: href="/", logo text "📈 Bullish Stock Predictor",
//               subtitle "BSE & NSE Signal Screener"
//   - utilities:
//       [0] text chip — "🟢 NSE / BSE Live" (static market-status indicator)
//       [1] <Toggle> — dark/light mode; calls applyMode('dark'|'light') on change
//               and propagates via onToggleMode prop
// aria-label="Main navigation"
```

### `AnalysisPage.jsx`

```jsx
// State:
//   tickers        (string)       — raw textarea/multiselect value
//   results        (array)        — all ScoredTicker objects from API (sorted desc)
//   failed         (array)        — [{ticker, reason}] objects from API
//   loading        (bool)
//   error          (string|null)
//   selectedTicker (string|null)
//   filterText     (string)       — TextFilter value for results table
//   sortingColumn  (object|null)  — Cloudscape table sorting state
//   sortingDescending (bool)
//
// Renders:
//   {results.length === 0 && !loading && <HeroBanner />}   — disappears after first load
//   <TickerInputForm onSubmit={handleSubmit} loading={loading} />
//   {loading && <SkeletonTable />}                          — pulse skeleton rows
//   {error && <Alert type="error">{error}</Alert>}
//   {results.length > 0 && (
//     <SpaceBetween>
//       <StatCardRow results={results} attempted={attempted} />
//       {failed.length > 0 && <FailedTickersBanner failed={failed} />}
//       <ResultsTable
//         results={results}
//         filterText={filterText}
//         onFilterChange={setFilterText}
//         sortingColumn={sortingColumn}
//         sortingDescending={sortingDescending}
//         onSortingChange={setSortingState}
//         onRowSelect={setSelectedTicker}
//       />
//     </SpaceBetween>
//   )}
//   {results.length === 0 && !loading && <TableEmptyState />} — inside table area
//   <StockDetailDrawer ticker={selectedTicker} onClose={()=>setSelectedTicker(null)} />
```

### `TickerInputForm.jsx`

```jsx
// Props: onSubmit(tickers: string[]), loading: bool
// Local state:
//   inputValue     (string)       — raw comma-separated ticker text
//   validationError (string|null)
//   preset         (string)       — selected quick-load preset key
//
// Renders (Cloudscape Form):
//   <Select>       — "Quick Load" preset dropdown
//                    options: "Nifty 50 sample (10)", "Sensex 30 sample (10)", "Custom"
//                    selecting a preset auto-populates inputValue with sample tickers
//   <FormField label="Stock Tickers" errorText={validationError}
//              secondaryControl={<Box variant="small">{tickerCount} tickers entered</Box>}>
//     <Textarea>   — comma-separated ticker input; updates tickerCount on change
//   </FormField>
//   Example ticker chips (Button variant="link", aria-label="Load example tickers"):
//     RELIANCE.NS · TCS.NS · INFY.NS · HDFC.NS · SBIN.NS
//     clicking any chip appends that ticker to inputValue
//   <Button variant="primary" loading={loading} onClick={handleSubmit}
//           aria-label="Analyse stocks">
//     Analyse
//   </Button>
//
// Validation: trims whitespace, removes duplicates, blocks empty submit,
//             enforces 1–500 ticker limit, shows inline FormField error
```

### `StatCard.jsx`

```jsx
// Props: label (string), value (string|number), icon (string), color (string)
// Renders a Cloudscape <Box> styled as a stat card:
//   - large bold <Box variant="h1"> for the numeric value
//   - <Box variant="small"> for the label
//   - coloured icon element (emoji or Cloudscape icon)
// Used inside a <ColumnLayout columns={4}> row in AnalysisPage
// aria-label={`${label}: ${value}`}
```

### `SignalDots.jsx`

```jsx
// Props: signals { rsi, macd, bb, ma, volume }
//        each signal value: 'bullish' | 'bearish' | 'neutral'
// Renders a <SpaceBetween direction="horizontal" size="xxs"> of 5 dots:
//   - bullish  → green filled circle (●)
//   - bearish  → red filled circle (●)
//   - neutral  → yellow filled circle (●)
// Each dot wrapped in a <span
//   role="img"
//   aria-label="{indicator name}: {signal}"
//   title="{indicator name}: {signal}"
// />
// Color is never the sole differentiator — aria-label always carries signal text
```

### `ScoreProgressBar.jsx`

```jsx
// Props: score (number 0–100), confidence ('High'|'Medium'|'Low')
// Renders a Cloudscape <ProgressBar value={score} label={`${score}/100`}>
//   - confidence "High"   → additionalInfo color green  (status="success")
//   - confidence "Medium" → additionalInfo color orange (status="in-progress")
//   - confidence "Low"    → additionalInfo color grey   (status="error")
// aria-label={`Bullish score: ${score} out of 100, confidence ${confidence}`}
```

### `SparklineCell.jsx`

```jsx
// Props: data (number[])   — last 30 closing prices, oldest-first
// Renders a Recharts inline chart (no axes, no tooltip, no legend):
//   <ResponsiveContainer width={80} height={30}>
//     <LineChart data={chartData}>
//       <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5}
//             stroke="#0073bb" />
//     </LineChart>
//   </ResponsiveContainer>
// Wrapped in <div role="img" aria-label="30-day price trend sparkline" />
```

### `FailedTickersBanner.jsx`

```jsx
// Props: failed ([{ticker: string, reason: string}])
// Renders a Cloudscape <ExpandableSection
//   headerText={`⚠ ${failed.length} ticker${failed.length > 1 ? 's' : ''} could not be analysed`}
//   variant="warning">
//   <ColumnLayout columns={2}>
//     {failed.map(f => (
//       <Box key={f.ticker}>
//         <Box fontWeight="bold">{f.ticker}</Box>
//         <Box variant="small" color="text-status-error">{f.reason}</Box>
//       </Box>
//     ))}
//   </ColumnLayout>
// </ExpandableSection>
// aria-label={`${failed.length} tickers failed analysis`}
```

### `StockDetailDrawer.jsx`

```jsx
// Props: ticker (string|null), onClose ()=>void
// Local state: detail (ScoredTicker|null), loadingDetail (bool), detailError (string|null)
// Effect: fetches GET /api/v1/ticker/{ticker} whenever ticker prop changes (non-null)
//
// Renders a Cloudscape <Drawer size="large" header={<DrawerHeader />}
//                              onClose={onClose}>
//   <DrawerHeader>:
//     <SpaceBetween direction="horizontal">
//       <Box variant="h2" fontWeight="bold">{ticker}</Box>
//       {companyName && <Box variant="small">{companyName}</Box>}
//       <Box>₹{lastClose}</Box>
//       <Box color={dayChange >= 0 ? "text-status-success" : "text-status-error"}>
//         {dayChange >= 0 ? "▲" : "▼"} {Math.abs(dayChange).toFixed(2)}%
//       </Box>
//     </SpaceBetween>
//
//   Body sections (inside <SpaceBetween size="l">):
//
//   1. Sub-score breakdown — 5 <ProgressBar> items with colour-coded status:
//        score 16–20 → status="success"  (green)
//        score  8–15 → status="in-progress" (orange)
//        score  0–7  → status="error"    (red)
//      Each bar: label="{Indicator}: {score}/20", description={signalLabel}
//
//   2. Price chart (role="img" aria-label="90-day price chart for {ticker}"):
//        <ComposedChart> 90-day OHLCV
//          <defs> — SVG gradient fill for area
//          <Area>  dataKey="close"  fill="url(#closeGradient)"  stroke="#0073bb"
//          <Line>  dataKey="sma50"  stroke="#0073bb"  strokeDasharray="4 2"  dot={false}
//          <Line>  dataKey="sma200" stroke="#d13212"  strokeDasharray="4 2"  dot={false}
//          <XAxis> tickFormatter={d => format(new Date(d), "dd MMM")}
//          <YAxis> tickFormatter={v => `₹${v.toLocaleString('en-IN')}`}
//          <Tooltip> content={<CustomTooltip />} showing date, close, sma50, sma200
//          <ReferenceLine x={projectedStartDate} stroke="#037f0c" strokeDasharray="3 3"
//                         label="Lower" />
//          <ReferenceLine x={projectedEndDate}   stroke="#d13212" strokeDasharray="3 3"
//                         label="Upper" />
//          <Legend />
//        Title: "90-Day Price History" above chart
//
//   3. Indicator Summary Table:
//        <Table
//          aria-label="Indicator breakdown"
//          variant="embedded"
//          items={indicatorRows}
//          columnDefinitions={[
//            { id: "indicator", header: "Indicator", cell: r => r.indicator },
//            { id: "value",     header: "Value",     cell: r => r.value },
//            { id: "signal",    header: "Signal",    cell: r => r.signal },
//            { id: "score",     header: "Sub-Score", cell: r => `${r.score}/20` },
//          ]}
//        />
//
//   4. 30-Day Projected Range bar (non-interactive visual):
//        A horizontal gradient bar (CSS linear-gradient: red left → green right)
//        with three marker labels: ₹{lower}  |  ₹{lastClose} (▲ current)  |  ₹{upper}
//        aria-label="30-day projected price range: lower ₹{lower}, upper ₹{upper}"
```

### `frontend/src/api/stockApi.js`

```js
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function analyzeStocks(tickers) {
  // POST /api/v1/analyze  →  AnalyzeResponse
}

export async function getTickerDetail(ticker) {
  // GET /api/v1/ticker/{ticker}  →  ScoredTicker | throws on 404
}
```

---

## UI Visual Design & Enrichment

This section specifies the visual design goals, interaction patterns, and component behaviour required to bring the frontend to a level of polish comparable to Google Finance or Amazon. All components use the AWS Cloudscape Design System unless stated otherwise.

---

### 1. App Header / Navigation Bar

**Component**: `AppHeader.jsx`

- Renders a Cloudscape `<TopNavigation>` with `position="sticky"` so it remains visible on scroll.
- **Left — Identity block**:
  - `logo`: `{ src: null, alt: "Bullish Stock Predictor" }`
  - `title`: `"📈 Bullish Stock Predictor"`
  - `href`: `"/"`
  - Below the title, a subtitle `<Box variant="small">BSE & NSE Signal Screener</Box>` is rendered as a secondary line using the `description` utility.
- **Right — Utilities**:
  - Static market-status chip: `type="text"`, text `"🟢 NSE / BSE Live"`, rendered as an unclickable label.
  - Dark/light mode toggle: `type="button"` wrapping a Cloudscape `<Toggle>` labelled `"Dark mode"`.
    - On toggle, calls `applyMode('dark' | 'light')` from `@cloudscape-design/global-styles`.
    - Persists preference to `localStorage` under key `bsp-color-mode`.

---

### 2. Landing / Hero Section

**Component**: `HeroBanner` (inline in `AnalysisPage.jsx`)

- Rendered only when `results.length === 0 && !loading` (i.e., before the first successful analysis).
- Implemented as a full-width Cloudscape `<Container>` with a dark gradient background applied via inline style: `background: linear-gradient(135deg, #0f1923 0%, #1a2e44 100%)`.
- **Content** (inside `<SpaceBetween size="m">`):
  - `<Box variant="h1" color="text-inverted">`: `"Identify the top 10 bullish stocks in Indian markets"`
  - `<Box variant="p" color="text-inverted">`: Two-sentence description of the scoring model (rule-based, 5 indicators, no ML).
  - Stats strip — a `<ColumnLayout columns={4}>` row of `<Box textAlign="center" color="text-inverted">` items:
    - `"500+"` · `"NSE tickers"`
    - `"500+"` · `"BSE tickers"`
    - `"5"` · `"Indicators"`
    - `"0"` · `"ML / AI"`
- Disappears (unmounts) once `results.length > 0`.

---

### 3. TickerInputForm — Enriched

**Component**: `TickerInputForm.jsx`

#### Quick Load Presets

A Cloudscape `<Select>` placed above the textarea:

```
label="Quick Load"
options=[
  { value: "nifty10",   label: "Nifty 50 sample (10)" },
  { value: "sensex10",  label: "Sensex 30 sample (10)" },
  { value: "custom",    label: "Custom" },
]
```

Selecting "Nifty 50 sample (10)" replaces `inputValue` with 10 representative `.NS` tickers drawn from `NIFTY_50`.  
Selecting "Sensex 30 sample (10)" replaces `inputValue` with 10 representative `.BO` tickers drawn from `SENSEX_30`.  
Selecting "Custom" clears the input and returns focus to the textarea.

#### Ticker Count Chip

A `<Box variant="small" display="inline-block">` rendered as a `secondaryControl` inside the `<FormField>`:

```
{tickerCount} ticker{tickerCount !== 1 ? 's' : ''} entered
```

`tickerCount` is derived live by splitting `inputValue` on commas, trimming, and counting non-empty tokens.

#### Example Ticker Chips

Below the textarea, a row of Cloudscape `<Button variant="link">` chips:

```
RELIANCE.NS   TCS.NS   INFY.NS   HDFC.NS   SBIN.NS
```

Each chip has `aria-label="Add {ticker} to input"`. Clicking a chip appends the ticker to `inputValue` if not already present (deduplication applies).

---

### 4. Summary Stat Cards

**Component**: `StatCard.jsx`, composed in a `<ColumnLayout columns={4}>` row inside `AnalysisPage`.

Rendered immediately below `<TickerInputForm>` and above the results table, only when `results.length > 0`.

| Card | Value derivation | Icon |
|---|---|---|
| Tickers Analysed | `attempted.length` | 📋 |
| Successfully Scored | `results.length` | ✅ |
| High Confidence | `results.filter(r => r.confidence === "High").length` | 🎯 |
| Average Bullish Score | `(Σ results[0..9].bullish_score / results.length).toFixed(1)` | 📈 |

Each `StatCard` renders:

```jsx
<Box padding="l" className="stat-card">
  <SpaceBetween size="xxs">
    <Box variant="h1" fontSize="display-l" fontWeight="bold"
         aria-label={`${label}: ${value}`}>
      {icon} {value}
    </Box>
    <Box variant="small" color="text-label">{label}</Box>
  </SpaceBetween>
</Box>
```

---

### 5. Results Table — Enriched Columns

**Component**: inline `<Table>` in `AnalysisPage.jsx`

```jsx
<Table
  aria-label="Top 10 bullish stocks"
  items={filteredResults}
  selectionType="single"
  onSelectionChange={({ detail }) => setSelectedTicker(detail.selectedItems[0]?.ticker)}
  stickyColumns={{ first: 1 }}        // Rank column stays visible on horizontal scroll
  sortingColumn={sortingColumn}
  sortingDescending={sortingDescending}
  onSortingChange={({ detail }) => setSortingState(detail)}
  filter={
    <TextFilter
      filteringText={filterText}
      onChange={({ detail }) => setFilterText(detail.filteringText)}
      filteringPlaceholder="Filter by ticker…"
      aria-label="Filter tickers"
    />
  }
  columnDefinitions={columnDefs}
/>
```

#### Column Definitions

| Column | `sortingField` | Cell renderer |
|---|---|---|
| **Rank** | `rank` | Plain number; sticky first column |
| **Ticker** | `ticker` | Bold text |
| **Trend** | — | `<SparklineCell data={r.sparklineData} />` |
| **Bullish Score** | `bullish_score` | `<ScoreProgressBar score={r.bullish_score} confidence={r.confidence} />` |
| **Confidence** | `confidence` | Cloudscape `<Badge color={badgeColor(r.confidence)}>` — green/High, grey/Medium, red/Low |
| **Signals** | — | `<SignalDots signals={r.signals} />` |
| **RSI** | `rsi_value` | Numeric, 2 decimal places |
| **MACD** | `macd_signal_label` | Label text |
| **BB** | `bb_signal_label` | Label text |
| **MA** | `ma_signal_label` | Label text |
| **Volume** | `volume_signal_label` | Label text |
| **30-Day Range** | `projected_lower` | `₹{lower} – ₹{upper}` |

`badgeColor` mapping: `"High" → "green"`, `"Medium" → "grey"`, `"Low" → "red"`.

#### Row Interaction

- Single-row selection via `selectionType="single"` triggers `StockDetailDrawer` open.
- Row hover highlight is provided natively by Cloudscape Table.

---

### 6. Failed Tickers Warning

**Component**: `FailedTickersBanner.jsx`

Rendered between the stat card row and the results table when `failed.length > 0`.

```jsx
<ExpandableSection
  headerText={`⚠ ${failed.length} ticker${failed.length !== 1 ? 's' : ''} could not be analysed`}
  variant="warning"
  aria-label={`${failed.length} tickers failed analysis. Expand to see details.`}
>
  <ColumnLayout columns={2} variant="text-grid">
    {failed.map(f => (
      <SpaceBetween key={f.ticker} size="xxxs">
        <Box fontWeight="bold">{f.ticker}</Box>
        <Box variant="small" color="text-status-error">{f.reason}</Box>
      </SpaceBetween>
    ))}
  </ColumnLayout>
</ExpandableSection>
```

---

### 7. StockDetailDrawer — Enriched

**Component**: `StockDetailDrawer.jsx`

- Cloudscape `<Drawer size="large">` (wide panel, ~50% viewport width on desktop).
- Full-width on mobile (see §8 Responsive Layout).

#### 7.1 Drawer Header

```jsx
<SpaceBetween direction="horizontal" size="m" alignItems="center">
  <Box variant="h2" fontWeight="bold">{ticker}</Box>
  {companyName && <Box variant="small" color="text-label">{companyName}</Box>}
  <Box fontWeight="bold">₹{lastClose.toLocaleString('en-IN')}</Box>
  <Box color={dayChange >= 0 ? "text-status-success" : "text-status-error"}
       aria-label={`Day change: ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}%`}>
    {dayChange >= 0 ? "▲" : "▼"} {Math.abs(dayChange).toFixed(2)}%
  </Box>
</SpaceBetween>
```

`dayChange` is computed as `((ohlcv_90d[-1].close - ohlcv_90d[-2].close) / ohlcv_90d[-2].close) * 100`.

#### 7.2 Sub-Score Breakdown

Five Cloudscape `<ProgressBar>` bars (one per indicator), rendered in a `<SpaceBetween size="s">`:

```jsx
<ProgressBar
  value={(subScore / 20) * 100}
  label={`${indicatorName}: ${subScore}/20`}
  description={signalLabel}
  status={subScore >= 16 ? "success" : subScore >= 8 ? "in-progress" : "error"}
  aria-label={`${indicatorName} sub-score: ${subScore} out of 20, signal: ${signalLabel}`}
/>
```

Colour mapping:
- `16–20` → `status="success"` (green)
- `8–15` → `status="in-progress"` (orange)
- `0–7` → `status="error"` (red)

#### 7.3 Price Chart (Recharts ComposedChart)

```jsx
<Box>
  <Box variant="h3">90-Day Price History</Box>
  <div role="img" aria-label={`90-day price chart for ${ticker}`}>
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <defs>
          <linearGradient id="closeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0073bb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0073bb" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <Area  dataKey="close"  fill="url(#closeGradient)"
               stroke="#0073bb" strokeWidth={2} dot={false} />
        <Line  dataKey="sma50"  stroke="#0073bb" strokeWidth={1.5}
               strokeDasharray="4 2" dot={false} name="SMA-50" />
        <Line  dataKey="sma200" stroke="#d13212" strokeWidth={1.5}
               strokeDasharray="4 2" dot={false} name="SMA-200" />
        <XAxis dataKey="date"
               tickFormatter={d => format(new Date(d), "dd MMM")}
               aria-label="Date axis" />
        <YAxis tickFormatter={v => `₹${v.toLocaleString('en-IN')}`}
               aria-label="Price axis (INR)" />
        <Tooltip content={<PriceTooltip />} />
        <Legend />
        <ReferenceLine x={projectedLowerDate} stroke="#037f0c"
                       strokeDasharray="3 3" label="↓ Lower" />
        <ReferenceLine x={projectedUpperDate} stroke="#d13212"
                       strokeDasharray="3 3" label="↑ Upper" />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
</Box>
```

`PriceTooltip` renders a styled card showing: `Date`, `Close ₹`, `SMA-50 ₹`, `SMA-200 ₹`.

#### 7.4 Indicator Summary Table

```jsx
<Table
  aria-label="Indicator breakdown"
  variant="embedded"
  items={[
    { indicator: "RSI (14)",            value: rsi.toFixed(2),       signal: rsiSignal,    score: subScores.rsi },
    { indicator: "MACD (12/26/9)",      value: macdLine.toFixed(4),  signal: macdSignal,   score: subScores.macd },
    { indicator: "Bollinger Bands",     value: lastClose.toFixed(2), signal: bbSignal,     score: subScores.bollinger },
    { indicator: "Moving Averages",     value: `SMA50: ₹${sma50}`,  signal: maSignal,     score: subScores.moving_avg },
    { indicator: "Volume Trend",        value: `${volRatio.toFixed(2)}×`, signal: volSignal, score: subScores.volume },
  ]}
  columnDefinitions={[
    { id: "indicator", header: "Indicator",  cell: r => r.indicator },
    { id: "value",     header: "Value",      cell: r => r.value },
    { id: "signal",    header: "Signal",     cell: r => r.signal },
    { id: "score",     header: "Sub-Score",  cell: r => `${r.score}/20` },
  ]}
/>
```

#### 7.5 30-Day Projected Range Visual Bar

A non-interactive visual bar showing the projected price range:

```jsx
<Box>
  <Box variant="h3">30-Day Projected Range</Box>
  <div
    style={{
      position: "relative",
      height: 24,
      borderRadius: 4,
      background: `linear-gradient(to right, #d13212 0%, #f8f8f8 50%, #037f0c 100%)`,
    }}
    role="img"
    aria-label={`30-day projected price range: lower ₹${lower}, current ₹${current}, upper ₹${upper}`}
  >
    {/* Current price marker */}
    <div style={{ position: "absolute", left: `${currentPct}%`, top: 0,
                  width: 3, height: "100%", background: "#0073bb" }} />
  </div>
  <ColumnLayout columns={3}>
    <Box textAlign="left"  variant="small">₹{lower}  ↙ Lower</Box>
    <Box textAlign="center" variant="small" fontWeight="bold">₹{current} ← Now</Box>
    <Box textAlign="right" variant="small">↗ Upper  ₹{upper}</Box>
  </ColumnLayout>
</Box>
```

`currentPct` = `((current - lower) / (upper - lower)) * 100`, clamped to [5, 95].

---

### 8. Responsive Layout

- **Root shell**: `<AppLayout>` wraps the entire SPA. `<AppHeader>` mounts as the `navigation` slot.
- **Main content**: `<ContentLayout>` with a `<Grid gridDefinition={[{ colspan: { default: 12 } }]}>` for single-column layout.
- **Mobile breakpoint (viewport < 768 px)**:
  - Results table hides all columns except Rank, Ticker, Bullish Score (as `ScoreProgressBar`), and Confidence Badge. This is achieved via Cloudscape `columnDefinitions[n].isRowHeader` and CSS `@media` rules that add `.hidden-mobile { display: none }` to non-essential column header/cell elements.
  - `<StockDetailDrawer>` takes `size="large"` but is overridden on mobile via CSS to `width: 100vw`.
  - `<TickerInputForm>` `<ColumnLayout>` collapses to single column.
- **`data-testid` attributes** are present on all interactive and key display elements for Playwright selectors.

---

### 9. Loading / Empty States

#### Skeleton Loading

While `loading === true`, the results area renders a `<SkeletonTable>` in place of the real `<Table>`:

```jsx
function SkeletonTable() {
  return (
    <Table
      aria-label="Loading results…"
      items={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
      columnDefinitions={skeletonColumns}   // same widths as real columns
      loading
      loadingText="Fetching and scoring tickers…"
    />
  );
}
```

The Cloudscape `<Table loading>` prop renders built-in animated skeleton rows — no custom CSS is required.

#### Empty State

When no analysis has run (`results.length === 0 && !loading && error === null`), the table area renders:

```jsx
<Box textAlign="center" padding="xxl">
  <Box variant="h2" aria-label="No results yet">📊 No results yet</Box>
  <Box variant="p" color="text-body-secondary">
    Enter tickers above and click Analyse
  </Box>
</Box>
```

This is passed as the `empty` prop to the Cloudscape `<Table>` component.

---

### 10. Accessibility

All interactive elements carry explicit `aria-label` attributes. Specific rules:

| Element | Requirement |
|---|---|
| `<TopNavigation>` | `aria-label="Main navigation"` |
| Dark mode `<Toggle>` | `aria-label="Toggle dark mode"` |
| Analyse `<Button>` | `aria-label="Analyse stocks"` |
| Example ticker chips | `aria-label="Add {ticker} to input"` |
| `<StatCard>` values | `aria-label="{label}: {value}"` |
| `<SignalDots>` each dot | `role="img"` + `aria-label="{indicator}: {signal}"` |
| `<ScoreProgressBar>` | `aria-label="Bullish score: {score}/100, confidence {conf}"` |
| `<SparklineCell>` | `role="img"` + `aria-label="30-day price trend sparkline"` |
| Results `<Table>` | `aria-label="Top 10 bullish stocks"` |
| `<TextFilter>` | `aria-label="Filter tickers"` |
| Price chart `<div>` | `role="img"` + `aria-label="90-day price chart for {ticker}"` |
| Range bar `<div>` | `role="img"` + `aria-label="30-day projected price range: lower ₹{l}, current ₹{c}, upper ₹{u}"` |
| Day-change `<Box>` | `aria-label="Day change: {±}X.XX%"` |
| `<ExpandableSection>` | `aria-label="{n} tickers failed analysis. Expand to see details."` |

Color is never the sole signal differentiator: `<SignalDots>` dots carry both colour and an `aria-label` with the signal text; `<Badge>` confidence labels carry both colour and the text label; `<ProgressBar>` status bars carry both colour and a descriptive `label` + `description`.

---

The backend maintains a single module-level dict keyed by ticker symbol:

```python
# src/api/cache.py
_session_cache: dict[str, ScoredTicker] = {}

def get(ticker: str) -> ScoredTicker | None: ...
def put(ticker: str, result: ScoredTicker) -> None: ...
def clear() -> None: ...
```

- Cache is populated during `POST /api/v1/analyze` after scoring.
- `GET /api/v1/ticker/{ticker}` performs a cache look-up; returns 404 on miss.
- Cache is in-memory only; cleared on server restart. No TTL in the MVP.
- Concurrent requests are safe for reads; writes use a simple threading lock.

---

## Error Handling Strategy

| Scenario | Backend behaviour | Frontend behaviour |
|---|---|---|
| Empty ticker input | — | Inline validation error; no request sent |
| Ticker > 20 chars / empty string | HTTP 422 with per-ticker reasons | Alert component (type="error") |
| All tickers fail data fetch | HTTP 422 with failed list | Alert component |
| Partial failures | HTTP 200, failed list in response | Table shows successful; banner lists skipped |
| yfinance exception | Log + mark failed; continue batch | Covered by partial failure |
| Ticker not in cache (detail) | HTTP 404 | Alert in drawer |
| Unexpected server error | HTTP 500 + log stack trace | Generic error Alert |

---

## CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The allowed origin should be configurable via the `FRONTEND_ORIGIN` environment variable for non-local deployments.

---

## Dependencies

### Python (`requirements.txt`)

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.1
yfinance==0.2.40
pandas==2.2.2
numpy==1.26.4
httpx==0.27.0        # for async test client
pytest==8.2.0
pytest-asyncio==0.23.6
```

### JavaScript (`frontend/package.json` key deps)

```json
{
  "@cloudscape-design/components": "^3.0.0",
  "@cloudscape-design/global-styles": "^1.0.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "recharts": "^2.12.0",
  "axios": "^1.7.0"
}
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Ticker parsing removes duplicates and trims whitespace

*For any* comma-separated ticker string with arbitrary surrounding whitespace and repeated symbols, the parsed output list should contain no duplicate symbols and every symbol should have no leading or trailing whitespace.

**Validates: Requirements 1.2**

---

### Property 2: Server-side ticker validation is length-bounded

*For any* non-empty string of 1–20 characters, ticker validation should pass. For any string that is empty or longer than 20 characters, ticker validation should fail and return a descriptive rejection reason.

**Validates: Requirements 1.4**

---

### Property 3: Batch size boundary is enforced

*For any* list of 1–500 tickers, the frontend should allow submission. For any empty list or list with more than 500 items, the frontend should block submission and show a validation error.

**Validates: Requirements 1.6**

---

### Property 4: Exchange suffix application is idempotent

*For any* ticker string that already ends with `.NS` or `.BO`, applying the suffix guard should return the string unchanged. For any ticker that does not carry a suffix, the caller-provided suffix should be appended exactly once.

**Validates: Requirements 2.2**

---

### Property 5: Insufficient-data tickers are excluded from scoring

*For any* OHLCV DataFrame with fewer than 50 rows, the DataFetcher should set the FetchResult status to `"insufficient_data"` and leave the DataFrame field as `None`, ensuring the ticker is excluded from indicator calculation and scoring.

**Validates: Requirements 2.3**

---

### Property 6: Indicator outputs are well-formed

*For any* OHLCV DataFrame with at least 200 rows (minimum required for SMA-200):
- RSI values are always in the closed interval [0, 100]
- Bollinger Band values satisfy upper > middle > lower for every computed row
- SMA values lie within the [min, max] range of the corresponding lookback window
- All indicator fields in the returned `IndicatorSet` are finite (non-NaN, non-infinite)

**Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.7**

---

### Property 7: MACD line equals fast EMA minus slow EMA

*For any* closing price series, the MACD line value at every position should equal the 12-period EMA value minus the 26-period EMA value at that same position.

**Validates: Requirements 3.2**

---

### Property 8: Bullish Score is always in [0, 100] and sub-scores sum correctly

*For any* `IndicatorSet` with finite values, the computed `bullish_score` should always be an integer in the range [0, 100], equal to the sum of the five sub-scores, and each individual sub-score should be in [0, 20].

**Validates: Requirements 4.1**

---

### Property 9: Sub-score piecewise mappings are exhaustive and correct

*For any* RSI value in [0, 100], MACD line/signal/histogram triple, closing price relative to Bollinger Bands, SMA-50/SMA-200/close triple, and 5-day/20-day volume pair:
- RSI sub-score is exactly 20 when RSI < 30, 15 when 30 ≤ RSI ≤ 50, 10 when 50 < RSI ≤ 70, and 0 when RSI > 70
- MACD sub-score is exactly 20 for full bullish alignment, 12 for partial, and 0 when below signal
- Bollinger sub-score is exactly 20/12/6/0 per the four price-band zones
- MA sub-score is exactly 20 for Golden Cross, 10 for price above SMA-50, and 0 otherwise
- Volume sub-score is exactly 20/10/0 per the three volume-ratio thresholds

**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

---

### Property 10: Confidence Level derivation is total and correct

*For any* integer Bullish Score in [0, 100], `derive_confidence` returns `"High"` for scores 75–100, `"Medium"` for 50–74, and `"Low"` for 0–49. Every possible score maps to exactly one confidence level.

**Validates: Requirements 4.7**

---

### Property 11: Projected Price Range is ordered around last close

*For any* positive last closing price and positive `log_return_std_30`, the computed projected range satisfies `projected_lower <= last_close <= projected_upper`. Both bounds are positive and finite.

**Validates: Requirements 4.8**

---

### Property 12: Ranking is sorted and complete

*For any* non-empty list of `ScoredTicker` objects:
- The ranked result contains all scored items
- Items are in non-increasing order of `bullish_score`
- Every item in the result is drawn from the original input (no fabrication)
- Each item in the result contains all required API response fields: ticker, bullish_score, confidence, rsi_value, macd_signal_label, bb_signal_label, ma_signal_label, volume_signal_label, projected_lower, projected_upper

**Validates: Requirements 5.1, 5.3**

---

### Property 13: Detail endpoint returns complete indicator data for analysed tickers

*For any* ticker that has been successfully analysed and stored in the session cache, a subsequent `GET /api/v1/ticker/{ticker}` should return a response containing all required indicator fields and exactly the most recent 90 days of OHLCV data (or all available data if fewer than 90 days are in the cache).

**Validates: Requirements 7.4**

---

## Observability Architecture

### Overview

A lightweight observability layer that captures runtime metrics, errors/warnings, and per-ticker health signals in a persistent SQLite store, exposes them via REST API endpoints, and renders them in a dedicated frontend tab with three panels. This design is architecturally compatible with MVP2's full Prometheus + structlog observability module.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Frontend — Observability Tab                           │
│  ┌────────────────┐  ┌───────────────────┐  ┌────────────────────────┐  │
│  │  MetricsPanel  │  │  ErrorLogPanel    │  │  FaqPanel              │  │
│  │  (counters,    │  │  (paginated table │  │  (searchable accordion │  │
│  │   latency,     │  │   with level      │  │   4 categories,        │  │
│  │   ticker       │  │   filter)         │  │   keyword filter)      │  │
│  │   health)      │  │                   │  │                        │  │
│  └────────────────┘  └───────────────────┘  └────────────────────────┘  │
│         │                     │                       │                   │
│         └─────────────────────┼───────────────────────┘                   │
│                   Hybrid Refresh: 30s auto-poll + manual button           │
└─────────────────────────────────│─────────────────────────────────────────┘
                                  │ HTTP/JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FastAPI — Observability Routes                         │
│                                                                          │
│  GET /api/v1/observability/metrics       → MetricsResponse               │
│  GET /api/v1/observability/errors        → ErrorLogResponse              │
│  GET /api/v1/observability/ticker-health → TickerHealthResponse          │
│  GET /api/v1/observability/faq           → FaqResponse                   │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  ObservabilityMiddleware                            │  │
│  │  • Records request_count + request_duration_ms per request         │  │
│  │  • Records WARNING on 4xx, ERROR on 5xx into error_log             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  @timed() Decorator + TimingContext                 │  │
│  │  • fetch_ticker_duration_ms                                        │  │
│  │  • indicator_total_ms, compute_rsi_ms, compute_macd_ms, ...        │  │
│  │  • scoring_duration_ms                                             │  │
│  │  • cache_hit / cache_miss                                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                        │
│                    ┌─────────────▼─────────────┐                         │
│                    │   src/observability/store  │                         │
│                    │   (aiosqlite)              │                         │
│                    └─────────────┬─────────────┘                         │
│                                  │                                        │
│                    ┌─────────────▼─────────────┐                         │
│                    │  data/observability.db     │                         │
│                    │  (SQLite — gitignored)     │                         │
│                    └───────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### SQLite Schema

```sql
-- Metric events (individual data points)
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,            -- ISO 8601
    metric_name TEXT NOT NULL,          -- e.g. "request_count", "request_duration_ms"
    metric_value REAL NOT NULL,
    labels TEXT                          -- JSON: {"path": "/api/v1/analyze", "method": "POST"}
);

-- Error and warning log
CREATE TABLE IF NOT EXISTS error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,            -- ISO 8601
    level TEXT NOT NULL,                -- "ERROR" | "WARNING"
    source_module TEXT NOT NULL,        -- e.g. "data.fetch_market_data", "middleware"
    message TEXT NOT NULL,
    details TEXT                         -- JSON: stack trace, ticker context, etc.
);

-- Per-ticker health tracking
CREATE TABLE IF NOT EXISTS ticker_health (
    ticker TEXT PRIMARY KEY,
    total_requests INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    last_failure_reason TEXT,
    last_success_at TEXT,               -- ISO 8601
    last_failure_at TEXT,               -- ISO 8601
    avg_confidence_score REAL,
    low_confidence_count INTEGER DEFAULT 0
);
```

### Module Signatures

#### `src/observability/__init__.py`

```python
# Package marker — exports store, middleware, timing
```

#### `src/observability/store.py`

```python
import aiosqlite
import json
from datetime import datetime, timezone

DB_PATH = "data/observability.db"

async def init_db() -> None:
    """Create database and tables if they don't exist."""
    ...

async def record_metric(name: str, value: float, labels: dict | None = None) -> None:
    """Insert a metric event with current ISO 8601 timestamp."""
    ...

async def record_error(level: str, source_module: str, message: str, details: dict | None = None) -> None:
    """Insert an error/warning log entry."""
    ...

async def update_ticker_health(
    ticker: str,
    success: bool,
    confidence_score: float | None = None,
    failure_reason: str | None = None,
) -> None:
    """Upsert ticker health record. Increments counters, updates timestamps."""
    ...

async def get_metrics(limit: int = 100) -> list[dict]:
    """Return most recent metric events, newest first."""
    ...

async def get_errors(limit: int = 50, offset: int = 0, level: str | None = None) -> tuple[list[dict], int]:
    """Return paginated error log. Returns (entries, total_count)."""
    ...

async def get_ticker_health() -> list[dict]:
    """Return all ticker health records sorted by failure rate descending."""
    ...

async def get_metric_summary() -> dict:
    """Return aggregated summary: total_requests, avg_latency_ms, cache_hits,
    cache_misses, total_errors, total_warnings, failed_ticker_rate."""
    ...
```

#### `src/observability/middleware.py`

```python
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Records request_count, request_duration_ms, and error events for every request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        1. Start timer
        2. Call next middleware/handler
        3. Record request_count metric with labels {path, method, status}
        4. Record request_duration_ms metric
        5. If status >= 500: record_error("ERROR", ...)
        6. If 400 <= status < 500: record_error("WARNING", ...)
        """
        ...
```

#### `src/observability/timing.py`

```python
import time
import functools
from src.observability.store import record_metric

def timed(metric_name: str):
    """Sync decorator that records execution time as a metric."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = func(*args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000
            # Fire-and-forget: schedule record_metric in background
            ...
            return result
        return wrapper
    return decorator

def timed_async(metric_name: str):
    """Async decorator that records execution time as a metric."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = await func(*args, **kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000
            await record_metric(metric_name, elapsed_ms, {"function": func.__name__})
            return result
        return wrapper
    return decorator

class TimingContext:
    """Context manager for ad-hoc timing blocks.

    Usage:
        with TimingContext("compute_rsi_ms") as t:
            result = compute_rsi(close)
    """
    def __init__(self, metric_name: str): ...
    def __enter__(self): ...
    def __exit__(self, *exc): ...
```

### Route Signatures

#### `src/api/routes/observability.py`

```python
from fastapi import APIRouter, Query
from src.api.models import MetricsResponse, ErrorLogResponse, TickerHealthResponse, FaqResponse

router = APIRouter(prefix="/api/v1/observability", tags=["observability"])

@router.get("/metrics", response_model=MetricsResponse,
            summary="Get observability metrics",
            description="Returns aggregated metric summary and recent metric events.")
async def get_metrics() -> MetricsResponse:
    ...

@router.get("/errors", response_model=ErrorLogResponse,
            summary="Get error log",
            description="Returns paginated error/warning log with optional level filter.")
async def get_errors(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    level: str | None = Query(None, regex="^(ERROR|WARNING)$"),
) -> ErrorLogResponse:
    ...

@router.get("/ticker-health", response_model=TickerHealthResponse,
            summary="Get per-ticker health data",
            description="Returns health records for all analysed tickers sorted by failure rate.")
async def get_ticker_health() -> TickerHealthResponse:
    ...

@router.get("/faq", response_model=FaqResponse,
            summary="Get FAQ knowledge base",
            description="Returns the static FAQ/debug guide from docs/faq.json.")
async def get_faq() -> FaqResponse:
    ...
```

### Pydantic Response Models

```python
# Added to src/api/models.py

class MetricEvent(BaseModel):
    timestamp: str
    metric_name: str
    metric_value: float
    labels: dict | None = None

class MetricSummary(BaseModel):
    total_requests: int
    avg_latency_ms: float
    cache_hits: int
    cache_misses: int
    total_errors: int
    total_warnings: int
    failed_ticker_rate: float  # percentage 0-100

class MetricsResponse(BaseModel):
    summary: MetricSummary
    recent: list[MetricEvent]

class ErrorLogEntry(BaseModel):
    id: int
    timestamp: str
    level: str
    source_module: str
    message: str
    details: dict | None = None

class ErrorLogResponse(BaseModel):
    entries: list[ErrorLogEntry]
    total_count: int
    limit: int
    offset: int

class TickerHealthEntry(BaseModel):
    ticker: str
    total_requests: int
    total_failures: int
    failure_rate: float  # percentage 0-100
    last_failure_reason: str | None = None
    last_success_at: str | None = None
    last_failure_at: str | None = None
    avg_confidence_score: float | None = None
    low_confidence_count: int

class TickerHealthResponse(BaseModel):
    tickers: list[TickerHealthEntry]

class FaqEntry(BaseModel):
    id: str
    question: str
    answer: str
    tags: list[str]
    related_metric: str | None = None

class FaqCategory(BaseModel):
    id: str
    name: str
    entries: list[FaqEntry]

class FaqResponse(BaseModel):
    categories: list[FaqCategory]
```

### Frontend Component Hierarchy

> **Implementation Note:** The actual implementation has 5 top-level tabs in App.jsx:
> 1. **Analysis** → AnalysisPage.jsx
> 2. **Observability** → ObservabilityPage.jsx (2 sub-tabs: Live Metrics, Error Log)
> 3. **FAQ / Debug Guide** → FaqPanel.jsx (separate top-level tab, not nested inside Observability)
> 4. **RAG Chat** (MVP4 placeholder)
> 5. **Admin** (MVP2 placeholder)

```
App.jsx
├── AppHeader (TopNavigation with Analysis / Observability / FAQ / RAG Chat / Admin tabs)
├── AnalysisPage.jsx (existing)
├── ObservabilityPage.jsx
│   └── Cloudscape Tabs
│       ├── Tab "Live Metrics" → MetricsPanel.jsx
│       │   ├── ColumnLayout (5 metric cards: Box + StatCard style)
│       │   ├── Table (ticker health with StatusIndicator)
│       │   ├── Button "Refresh Now"
│       │   └── Spinner + "Last updated" text
│       └── Tab "Error Log" → ErrorLogPanel.jsx
│           ├── Select (level filter: All/ERROR/WARNING)
│           ├── Table (Timestamp, Level Badge, Source, Message)
│           ├── Expandable row details (pre block)
│           └── Pagination
└── FaqPanel.jsx (top-level tab)
    ├── TextFilter (keyword search)
    └── 5 × ExpandableSection (one per category)
        └── List of Q&A items (question, answer, tags as Badge, related_metric)
```

### FAQ JSON Structure

```json
{
  "categories": [
    {
      "id": "data-fetch-errors",
      "name": "Data Fetch Errors",
      "entries": [
        {
          "id": "faq-001",
          "question": "Why does a ticker return 'insufficient_data'?",
          "answer": "The ticker has fewer than 50 trading days of OHLCV data available from yfinance. This typically happens with recently listed IPOs, suspended stocks, or tickers with incorrect suffix format. The minimum threshold of 50 days is required to compute reliable 200-period SMA indicators.",
          "tags": ["yfinance", "data", "insufficient", "validation"],
          "related_metric": "failed_ticker_rate"
        }
      ]
    },
    {
      "id": "scoring-indicators",
      "name": "Scoring & Indicators",
      "entries": [...]
    },
    {
      "id": "infrastructure-config",
      "name": "Infrastructure/Config",
      "entries": [...]
    },
    {
      "id": "metrics-explained",
      "name": "Metrics Explained",
      "entries": [...]
    }
  ]
}
```

### Instrumentation Points

> **⚠️ IMPLEMENTATION STATUS NOTE:** The `@timed` decorator and `TimingContext` are defined in `src/observability/timing.py` but are **NOT YET APPLIED** to any functions. Cache hit/miss metrics are not emitted. `update_ticker_health()` is defined but never called from routes. Only the middleware instrumentation (request_count, request_duration_ms, error logging) is active.

| Module | Metric Recorded | Error Recorded | Ticker Health Updated |
|---|---|---|---|
| `middleware` | `request_count`, `request_duration_ms` | WARNING on 4xx, ERROR on 5xx | — |
| `fetch_market_data.fetch_ticker()` | `fetch_ticker_duration_ms` | WARNING on fetch failure | Yes (success/failure) |
| `indicator_calculator.compute_indicators()` | `indicator_total_ms`, `compute_rsi_ms`, `compute_macd_ms`, `compute_bollinger_ms`, `compute_sma_ms`, `compute_ema_ms`, `compute_volume_ms` | — | — |
| `bullish_scorer.score_ticker()` | `scoring_duration_ms` | — | Yes (confidence tracking) |
| `cache.get()` | `cache_hit` or `cache_miss` | — | — |

### Correctness Properties (Observability)

#### Property 14: Observability DB is initialized on startup

*For any* application startup (with or without an existing `data/observability.db` file), the `init_db()` function should ensure all three tables (`metrics`, `error_log`, `ticker_health`) exist and are queryable.

**Validates: Requirements 10.1**

#### Property 15: Every HTTP request records exactly one request_count and one request_duration_ms metric

*For any* HTTP request processed by the application (regardless of success or failure status code), exactly two metric records are inserted: one `request_count` with value 1, and one `request_duration_ms` with a positive value.

**Validates: Requirements 10.6**

#### Property 16: Error log entries are created for all 4xx and 5xx responses

*For any* HTTP response with status code >= 400 and < 500, a WARNING entry is inserted into `error_log`. *For any* HTTP response with status code >= 500, an ERROR entry is inserted.

**Validates: Requirements 10.9**

#### Property 17: FAQ response contains exactly 5 categories with non-empty entries

*For any* call to `GET /api/v1/observability/faq`, the response contains exactly 5 categories, each with at least 5 entries, and every entry has non-empty `id`, `question`, `answer`, and `tags` fields.

**Validates: Requirements 10.5, 10.15**


---

## Implementation Status

*Last updated: 2026-07-23*

| Area | Status | Notes |
|---|---|---|
| **Overall** | ~85% complete | Core functional; observability wiring incomplete |
| Core pipeline (fetch → indicators → score → cache → API → frontend) | ✅ COMPLETE | End-to-end working |
| Observability infrastructure (store, middleware, timing utilities, routes) | ✅ COMPLETE | All modules defined and route handlers functional |
| Observability wiring (applying `@timed` decorators, calling `update_ticker_health()`, cache hit/miss metrics) | ❌ NOT DONE | Decorators defined but never applied; health update never called |
| structlog | ❌ NOT CONFIGURED | Listed in `requirements.txt` but application uses standard `logging` module |
| Frontend (AnalysisPage, TickerInputForm, StockDetailDrawer, ObservabilityPage, FaqPanel) | ✅ COMPLETE | All components rendered and functional |
| Tests (8 smoke test files) | ✅ COMPLETE | All passing; MVP1b will expand to ~140 tests |

### Known Deviations from Original Spec

1. **Returns all scored tickers** (not top-10) — frontend paginates at 10/page
2. **Ticker limit is 500** (not 200) — more permissive than originally specified
3. **FAQ has 5 categories** (not 4) — additional category is a bonus
4. **Sequential fetching** — ThreadPoolExecutor concurrency deferred to MVP1b
5. **Models use Pydantic v2 BaseModel** — not Python dataclasses
6. **ObservabilityPage has 2 tabs** (Metrics + Errors), FAQ is a separate top-level tab
