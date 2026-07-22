# Requirements Document

## Introduction

The Bullish Stock Predictor is a full-stack MVP application that accepts a user-supplied list of BSE/NSE stock tickers, fetches one year of historical OHLCV data via yfinance, computes a composite bullish score (0–100) from five standard technical indicators (RSI, MACD, Bollinger Bands, Moving Averages, Volume Trend), and surfaces the top 10 most bullish stocks for the next 30-day outlook. The backend is a FastAPI service; the frontend is a React application styled with the AWS Cloudscape Design System.

---

## Glossary

- **Bullish Score**: A composite integer score in the range 0–100 representing the overall bullish strength of a ticker derived from weighted technical indicator signals.
- **Ticker**: A stock symbol string accepted by yfinance; NSE tickers use the `.NS` suffix and BSE tickers use the `.BO` suffix.
- **OHLCV**: Open, High, Low, Close, Volume — the standard candlestick data fields.
- **RSI**: Relative Strength Index — a momentum oscillator measuring the speed and magnitude of recent price changes.
- **MACD**: Moving Average Convergence Divergence — a trend-following momentum indicator derived from the difference between two exponential moving averages.
- **Bollinger Bands**: A volatility indicator consisting of a middle SMA and upper/lower bands set two standard deviations away.
- **SMA**: Simple Moving Average.
- **EMA**: Exponential Moving Average.
- **Golden Cross**: A bullish signal where a short-period SMA crosses above a long-period SMA.
- **API Server**: The FastAPI Python backend service.
- **Prediction Engine**: The rule-based scoring module within `src/models/` responsible for computing the Bullish Score.
- **Data Fetcher**: The yfinance-based module within `src/data/` responsible for downloading historical OHLCV data.
- **Indicator Calculator**: The module within `src/features/` responsible for computing all technical indicators.
- **Frontend**: The React + Cloudscape Design System single-page application in the `frontend/` directory.
- **Confidence Level**: A qualitative label (Low / Medium / High) derived from the Bullish Score range.
- **Projected Price Range**: A 30-day forward price range estimate computed from recent volatility.

---

## Requirements

### Requirement 1 — Ticker Input and Validation

**User Story:** As a trader, I want to submit a list of stock ticker symbols, so that the system analyses only the stocks I am interested in.

#### Acceptance Criteria

1. THE Frontend SHALL render a text input field that accepts a comma-separated list of Ticker strings.
2. WHEN the user submits the ticker list, THE Frontend SHALL trim whitespace and remove duplicate Tickers before sending the request to the API Server.
3. IF the submitted ticker list is empty, THEN THE Frontend SHALL display an inline validation error message and SHALL NOT send a request to the API Server.
4. WHEN a ticker list is received by the API Server, THE API Server SHALL validate that each Ticker string is non-empty and does not exceed 20 characters.
5. IF any Ticker fails server-side validation, THEN THE API Server SHALL return HTTP 422 with a JSON body listing each invalid Ticker and the reason for rejection.
6. THE Frontend SHALL accept a minimum of 1 Ticker and a maximum of 200 Tickers per submission.

---

### Requirement 2 — Historical Data Fetching

**User Story:** As a trader, I want the system to fetch one year of historical price data for each ticker, so that technical indicators are computed on a meaningful historical window.

#### Acceptance Criteria

1. WHEN a valid ticker list is received, THE Data Fetcher SHALL download 1 year of daily OHLCV data for each Ticker using the yfinance library.
2. THE Data Fetcher SHALL apply the `.NS` suffix for NSE tickers and the `.BO` suffix for BSE tickers as specified by the user-submitted Ticker string.
3. IF yfinance returns fewer than 50 trading days of data for a Ticker, THEN THE Data Fetcher SHALL mark that Ticker as insufficient data and exclude it from scoring.
4. IF yfinance raises a network or authentication exception for a Ticker, THEN THE Data Fetcher SHALL log the error and mark that Ticker as failed rather than aborting the entire analysis.
5. THE Data Fetcher SHALL complete the download of all Tickers within 60 seconds for a batch of up to 50 Tickers under normal network conditions.

---

### Requirement 3 — Technical Indicator Calculation

**User Story:** As a trader, I want standard technical indicators computed on each stock's price history, so that the bullish scoring is based on well-established market signals.

#### Acceptance Criteria

1. WHEN OHLCV data is available for a Ticker, THE Indicator Calculator SHALL compute RSI using a 14-period lookback window on daily closing prices.
2. WHEN OHLCV data is available for a Ticker, THE Indicator Calculator SHALL compute MACD using a 12-period fast EMA, 26-period slow EMA, and 9-period signal line.
3. WHEN OHLCV data is available for a Ticker, THE Indicator Calculator SHALL compute Bollinger Bands using a 20-period SMA and 2 standard-deviation upper and lower bands on daily closing prices.
4. WHEN OHLCV data is available for a Ticker, THE Indicator Calculator SHALL compute a 50-period SMA and a 200-period SMA on daily closing prices.
5. WHEN OHLCV data is available for a Ticker, THE Indicator Calculator SHALL compute a 20-period EMA on daily closing prices.
6. WHEN OHLCV data is available for a Ticker, THE Indicator Calculator SHALL compute a 5-day volume trend by comparing the average daily volume of the most recent 5 trading days against the 20-day average daily volume.
7. THE Indicator Calculator SHALL expose all computed indicator values as a structured Python dataclass or dictionary keyed by Ticker symbol.

---

### Requirement 4 — Bullish Score Computation

**User Story:** As a trader, I want each stock assigned a composite bullish score from 0 to 100, so that I can objectively compare bullish potential across tickers.

#### Acceptance Criteria

1. THE Prediction Engine SHALL compute a Bullish Score for each valid Ticker as a weighted sum of five indicator sub-scores, each in the range 0–20, summing to a maximum of 100.
2. WHEN RSI is below 30, THE Prediction Engine SHALL assign the RSI sub-score a value of 20 (oversold/bullish reversal). WHEN RSI is between 30 and 50 inclusive, THE Prediction Engine SHALL assign the RSI sub-score a value of 15. WHEN RSI is between 50 and 70 inclusive, THE Prediction Engine SHALL assign the RSI sub-score a value of 10. WHEN RSI is above 70, THE Prediction Engine SHALL assign the RSI sub-score a value of 0 (overbought).
3. WHEN the MACD line is above the signal line and the histogram value is positive and increasing, THE Prediction Engine SHALL assign the MACD sub-score a value of 20. WHEN the MACD line is above the signal line only, THE Prediction Engine SHALL assign the MACD sub-score a value of 12. WHEN the MACD line is below the signal line, THE Prediction Engine SHALL assign the MACD sub-score a value of 0.
4. WHEN the closing price is below the lower Bollinger Band, THE Prediction Engine SHALL assign the Bollinger Band sub-score a value of 20 (oversold breakout potential). WHEN the closing price is between the lower band and the SMA midline, THE Prediction Engine SHALL assign the Bollinger Band sub-score a value of 12. WHEN the closing price is between the SMA midline and the upper band, THE Prediction Engine SHALL assign the Bollinger Band sub-score a value of 6. WHEN the closing price is above the upper Bollinger Band, THE Prediction Engine SHALL assign the Bollinger Band sub-score a value of 0.
5. WHEN the 50-period SMA is above the 200-period SMA (Golden Cross condition), THE Prediction Engine SHALL assign the Moving Average sub-score a value of 20. WHEN the closing price is above the 50-period SMA but the Golden Cross condition is not met, THE Prediction Engine SHALL assign the Moving Average sub-score a value of 10. WHEN neither condition is met, THE Prediction Engine SHALL assign the Moving Average sub-score a value of 0.
6. WHEN the 5-day average volume exceeds the 20-day average volume by more than 20%, THE Prediction Engine SHALL assign the Volume Trend sub-score a value of 20. WHEN the 5-day average volume is within 20% of the 20-day average volume, THE Prediction Engine SHALL assign the Volume Trend sub-score a value of 10. WHEN the 5-day average volume is more than 20% below the 20-day average volume, THE Prediction Engine SHALL assign the Volume Trend sub-score a value of 0.
7. THE Prediction Engine SHALL derive the Confidence Level from the Bullish Score: scores 75–100 map to "High", scores 50–74 map to "Medium", and scores 0–49 map to "Low".
8. THE Prediction Engine SHALL compute a 30-day Projected Price Range using the formula: lower bound = last closing price × (1 − annualised_volatility × sqrt(30/252)), upper bound = last closing price × (1 + annualised_volatility × sqrt(30/252)), where annualised volatility is derived from the standard deviation of daily log returns over the most recent 30 trading days.

---

### Requirement 5 — Top-10 Ranking and API Response

**User Story:** As a trader, I want the API to return the top 10 most bullish stocks ranked by score, so that I can focus on the highest-potential candidates.

#### Acceptance Criteria

1. THE API Server SHALL sort all successfully scored Tickers by Bullish Score in descending order and return the top 10 as the ranked result set.
2. IF fewer than 10 Tickers are successfully scored, THEN THE API Server SHALL return all successfully scored Tickers ranked by Bullish Score.
3. THE API Server SHALL include the following fields for each ranked Ticker in the response: ticker symbol, Bullish Score, Confidence Level, RSI value, MACD signal (bullish/neutral/bearish), Bollinger Band signal (oversold/neutral/overbought), Moving Average signal (golden cross/above MA/below MA), Volume Trend signal (high/normal/low), Projected Price Range lower bound, and Projected Price Range upper bound.
4. THE API Server SHALL respond to a valid analysis request within 90 seconds for a batch of up to 50 Tickers.
5. THE API Server SHALL expose the analysis endpoint at `POST /api/v1/analyze` accepting a JSON body with a `tickers` array of strings.
6. IF all submitted Tickers fail data fetching or validation, THEN THE API Server SHALL return HTTP 422 with an error message listing all failed Tickers and their failure reasons.

---

### Requirement 6 — Frontend Top-10 Results Table

**User Story:** As a trader, I want to see the top 10 bullish stocks in a ranked table with key signals, so that I can quickly compare and identify the best candidates.

#### Acceptance Criteria

1. THE Frontend SHALL render the ranked results in a Cloudscape Table component with the following columns: Rank, Ticker, Bullish Score, Confidence Level, RSI Signal, MACD Signal, BB Signal, MA Signal, Volume Signal, 30-Day Price Range.
2. THE Frontend SHALL display the Confidence Level using a Cloudscape Badge component with distinct colours: green for "High", orange for "Medium", and grey for "Low".
3. WHEN the analysis is in progress, THE Frontend SHALL display a Cloudscape Spinner component and disable the submit button.
4. WHEN the API Server returns an error response, THE Frontend SHALL display the error details in a Cloudscape Alert component of type "error".
5. THE Frontend SHALL sort the table rows by Bullish Score in descending order by default, matching the server-returned rank order.
6. WHERE the user selects a row in the results table, THE Frontend SHALL open a detail drawer/panel for that Ticker.

---

### Requirement 7 — Per-Stock Detail Panel

**User Story:** As a trader, I want to drill into a single stock's indicator breakdown and price chart, so that I can understand the reasoning behind its bullish score.

#### Acceptance Criteria

1. WHEN the user selects a Ticker from the results table, THE Frontend SHALL display a side panel or drawer containing the indicator breakdown for that Ticker.
2. THE Frontend SHALL render the per-stock detail panel using Cloudscape Container and SpaceBetween components, listing each indicator name, its computed value, its sub-score contribution, and a plain-language signal explanation.
3. THE Frontend SHALL render a price chart for the selected Ticker using a line or candlestick chart that displays the closing price alongside the 50-period SMA and 200-period SMA overlays for the most recent 90 trading days.
4. THE API Server SHALL expose a detail endpoint at `GET /api/v1/ticker/{ticker}` that returns full indicator values, sub-scores, signal explanations, and the last 90 days of OHLCV data for the requested Ticker.
5. IF no analysis has been run yet for the requested Ticker, THEN THE API Server SHALL return HTTP 404 with a message indicating the Ticker has not been analysed.

---

### Requirement 8 — Application Structure and Code Quality

**User Story:** As a developer, I want the application to follow the established project structure and coding conventions, so that the codebase is maintainable and testable.

#### Acceptance Criteria

1. THE API Server SHALL be implemented as a FastAPI application with the entry point at `src/api/main.py` and route handlers organised under `src/api/routes/`.
2. THE Data Fetcher SHALL be implemented as a Python module at `src/data/fetch_market_data.py`.
3. THE Indicator Calculator SHALL be implemented as a Python module at `src/features/indicator_calculator.py`.
4. THE Prediction Engine SHALL be implemented as a Python module at `src/models/bullish_scorer.py`.
5. THE Frontend SHALL be implemented as a React application in the `frontend/` directory, with the main analysis view at `frontend/src/pages/AnalysisPage.jsx` and the detail panel at `frontend/src/components/StockDetailDrawer.jsx`.
6. THE API Server SHALL include a `requirements.txt` listing all Python dependencies with pinned version numbers.
7. THE Frontend SHALL use `npm` for package management and include a `frontend/package.json` listing all JavaScript dependencies.
8. THE API Server SHALL enable CORS for the Frontend origin to allow cross-origin requests during local development.
