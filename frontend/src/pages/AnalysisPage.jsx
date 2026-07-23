import React, { useState } from 'react';
import {
  SpaceBetween,
  Table,
  Badge,
  Link,
  Box,
  Alert,
  Flashbar,
  Header,
  TextFilter,
  Popover,
} from '@cloudscape-design/components';
import TickerInputForm from '../components/TickerInputForm';
import StockDetailSection from '../components/StockDetailDrawer';
import { analyzeStocks } from '../api/stockApi';

/** Gradient pill for the main bullish score */
function ScorePill({ score }) {
  const level = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
  return <span className={`score-pill score-pill--${level}`}>{score}</span>;
}

/** Color-coded badge for sub-scores (0–20) */
function SubScoreBadge({ value }) {
  const level = value >= 15 ? 'high' : value >= 10 ? 'medium' : 'low';
  return <span className={`sub-badge sub-badge--${level}`}>{value}</span>;
}

/** Popover column header with indicator explanation */
function ColumnHeader({ label, description }) {
  return (
    <Popover
      dismissButton={false}
      position="top"
      size="medium"
      triggerType="text"
      content={<Box padding="s" fontSize="body-s">{description}</Box>}
    >
      <span style={{ cursor: 'help', borderBottom: '1px dashed #64748b' }}>{label}</span>
    </Popover>
  );
}

// Indicator legend descriptions for popovers
const LEGENDS = {
  rsi: "RSI (14) — Momentum oscillator. Score: <30 oversold = 20pts, 30–50 = 15pts, 50–70 = 10pts, >70 overbought = 0pts.",
  macd: "MACD (12/26/9) — Trend momentum. Score: Above signal + rising = 20pts, above signal = 12pts, below = 0pts.",
  bb: "Bollinger Bands (20/2σ) — Volatility. Score: Below lower = 20pts, lower→mid = 12pts, mid→upper = 6pts, above upper = 0pts.",
  ma: "Moving Averages — SMA50 vs SMA200. Score: Golden cross = 20pts, above SMA50 = 10pts, below = 0pts.",
  volume: "Volume Trend — 5d vs 20d avg. Score: >120% = 20pts, 80–120% = 10pts, <80% = 0pts.",
};

/**
 * AnalysisPage — Main analysis view with ticker input, full results table (no pagination),
 * and inline detail section below the table (no overlay drawer).
 */
export default function AnalysisPage({ onLoadingChange }) {
  const [results, setResults] = useState([]);
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [filterText, setFilterText] = useState('');

  async function handleAnalyze(tickers) {
    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    setError('');
    setFailed([]);
    setSelectedTicker(null);
    setFilterText('');
    try {
      const data = await analyzeStocks(tickers);
      setResults(data.results || []);
      setFailed(data.failed || []);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (detail && typeof detail === 'object') {
        msg = detail.message || detail.hint || JSON.stringify(detail);
      } else {
        msg = err.message || 'Analysis failed. Please try again.';
      }
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
      if (onLoadingChange) onLoadingChange(false);
    }
  }

  const filteredResults = results.filter(
    (item) => !filterText || item.ticker.toLowerCase().includes(filterText.toLowerCase())
  );

  const columnDefinitions = [
    {
      id: 'rank',
      header: '#',
      cell: (item) => filteredResults.indexOf(item) + 1,
      width: 45,
    },
    {
      id: 'ticker',
      header: 'Ticker',
      cell: (item) => (
        <Link onFollow={() => setSelectedTicker(item)} data-testid={`ticker-link-${item.ticker}`}>
          {item.ticker}
        </Link>
      ),
      sortingField: 'ticker',
    },
    {
      id: 'bullish_score',
      header: 'Score',
      cell: (item) => <ScorePill score={item.bullish_score} />,
      sortingField: 'bullish_score',
      width: 80,
    },
    {
      id: 'confidence',
      header: 'Confidence',
      cell: (item) => {
        const color = { High: 'green', Medium: 'blue', Low: 'grey' }[item.confidence] || 'grey';
        return <Badge color={color}>{item.confidence}</Badge>;
      },
      width: 100,
    },
    {
      id: 'rsi',
      header: <ColumnHeader label="RSI" description={LEGENDS.rsi} />,
      cell: (item) => <SubScoreBadge value={item.sub_scores.rsi} />,
      width: 65,
    },
    {
      id: 'macd',
      header: <ColumnHeader label="MACD" description={LEGENDS.macd} />,
      cell: (item) => <SubScoreBadge value={item.sub_scores.macd} />,
      width: 65,
    },
    {
      id: 'bollinger',
      header: <ColumnHeader label="BB" description={LEGENDS.bb} />,
      cell: (item) => <SubScoreBadge value={item.sub_scores.bollinger} />,
      width: 65,
    },
    {
      id: 'moving_avg',
      header: <ColumnHeader label="MA" description={LEGENDS.ma} />,
      cell: (item) => <SubScoreBadge value={item.sub_scores.moving_avg} />,
      width: 65,
    },
    {
      id: 'volume',
      header: <ColumnHeader label="Vol" description={LEGENDS.volume} />,
      cell: (item) => <SubScoreBadge value={item.sub_scores.volume} />,
      width: 65,
    },
    {
      id: 'range',
      header: '30-Day Range',
      cell: (item) => `₹${item.projected_lower?.toFixed(0)} – ₹${item.projected_upper?.toFixed(0)}`,
      width: 140,
    },
  ];

  return (
    <SpaceBetween size="l">
      <TickerInputForm onSubmit={handleAnalyze} onClear={() => { setResults([]); setFailed([]); setError(''); setSelectedTicker(null); setFilterText(''); }} loading={loading} />

      {error && (
        <Flashbar
          items={[{
            type: 'error',
            content: error,
            dismissible: true,
            onDismiss: () => setError(''),
            id: 'analysis-error',
          }]}
          data-testid="analysis-error"
        />
      )}

      {failed.length > 0 && (
        <Alert type="warning" dismissible data-testid="failed-tickers-alert">
          <strong>{failed.length} ticker(s) failed:</strong>{' '}
          {failed.slice(0, 5).map((f) => `${f.ticker} (${f.reason})`).join(', ')}
          {failed.length > 5 && ` ...and ${failed.length - 5} more`}
        </Alert>
      )}

      {results.length > 0 && (
        <>
          {/* Legend */}
          <Alert type="info" data-testid="column-legend">
            <strong>Legend:</strong>{' '}
            RSI = Relative Strength Index · MACD = Moving Avg Convergence/Divergence · BB = Bollinger Bands · MA = Moving Averages · Vol = Volume Trend
            — <em>hover column headers for scoring rules</em>
          </Alert>

          <Table
            header={
              <Header
                variant="h2"
                counter={`(${filteredResults.length})`}
                description="Click any ticker for full indicator breakdown below"
              >
                Bullish Stock Rankings
              </Header>
            }
            columnDefinitions={columnDefinitions}
            items={filteredResults}
            sortingDisabled
            stickyHeader
            stripedRows
            data-testid="results-table"
            filter={
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Filter by ticker..."
                onChange={({ detail }) => {
                  setFilterText(detail.filteringText);
                }}
                data-testid="results-filter"
              />
            }
            empty={
              <Box textAlign="center" color="inherit">
                <b>No matching results</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  Try a different filter or submit more tickers.
                </Box>
              </Box>
            }
          />
        </>
      )}

      {/* Inline detail section — displayed below the table, not as an overlay */}
      {selectedTicker && (
        <StockDetailSection
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </SpaceBetween>
  );
}
