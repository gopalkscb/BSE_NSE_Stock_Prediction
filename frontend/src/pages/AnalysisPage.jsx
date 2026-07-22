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
  Pagination,
  TextFilter,
  Popover,
  StatusIndicator,
} from '@cloudscape-design/components';
import TickerInputForm from '../components/TickerInputForm';
import StockDetailDrawer from '../components/StockDetailDrawer';
import { analyzeStocks } from '../api/stockApi';

const PAGE_SIZE = 10;

function confidenceColor(confidence) {
  return { High: 'green', Medium: 'blue', Low: 'grey' }[confidence] || 'grey';
}

/** Column header with tooltip/legend */
function ColumnHeader({ label, description }) {
  return (
    <Popover
      dismissButton={false}
      position="top"
      size="medium"
      triggerType="text"
      content={<Box padding="s">{description}</Box>}
    >
      <Box fontWeight="bold" color="text-status-info" fontSize="body-s">
        {label}
      </Box>
    </Popover>
  );
}

// Column legend descriptions
const LEGENDS = {
  rsi: "RSI (Relative Strength Index) — Momentum oscillator measuring speed of price changes. Score 0-20: <30 oversold (20pts), 30-50 (15pts), 50-70 (10pts), >70 overbought (0pts).",
  macd: "MACD (Moving Average Convergence Divergence) — Trend-following momentum. Score 0-20: Above signal + rising histogram (20pts), above signal (12pts), below signal (0pts).",
  bb: "BB (Bollinger Bands) — Volatility bands around a moving average. Score 0-20: Below lower band (20pts), lower-to-mid (12pts), mid-to-upper (6pts), above upper (0pts).",
  ma: "MA (Moving Averages) — SMA50 vs SMA200 crossover signal. Score 0-20: Golden cross SMA50>SMA200 (20pts), price above SMA50 (10pts), below SMA50 (0pts).",
  volume: "Vol (Volume Trend) — 5-day vs 20-day average volume comparison. Score 0-20: 5d avg >120% of 20d (20pts), 80-120% (10pts), <80% low volume (0pts).",
};

/**
 * AnalysisPage - Main page with ticker input, paginated results table, and detail drawer.
 * Exports loading state for App.jsx to disable other tabs during analysis.
 */
export default function AnalysisPage({ onLoadingChange }) {
  const [results, setResults] = useState([]);
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');

  async function handleAnalyze(tickers) {
    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    setError('');
    setFailed([]);
    setSelectedTicker(null);
    setCurrentPage(1);
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

  // Filter results by ticker name
  const filteredResults = results.filter(
    (item) => !filterText || item.ticker.toLowerCase().includes(filterText.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const columnDefinitions = [
    {
      id: 'rank',
      header: '#',
      cell: (item) => filteredResults.indexOf(item) + 1,
      width: 50,
    },
    {
      id: 'ticker',
      header: 'Ticker',
      cell: (item) => (
        <Link
          onFollow={() => setSelectedTicker(item)}
          data-testid={`ticker-link-${item.ticker}`}
        >
          {item.ticker}
        </Link>
      ),
      sortingField: 'ticker',
    },
    {
      id: 'bullish_score',
      header: 'Bullish Score',
      cell: (item) => (
        <span className={item.bullish_score >= 75 ? 'score-high' : item.bullish_score >= 50 ? 'score-medium' : 'score-low'}>
          {item.bullish_score}/100
        </span>
      ),
      sortingField: 'bullish_score',
    },
    {
      id: 'confidence',
      header: 'Confidence',
      cell: (item) => <Badge color={confidenceColor(item.confidence)}>{item.confidence}</Badge>,
    },
    {
      id: 'rsi',
      header: <ColumnHeader label="RSI" description={LEGENDS.rsi} />,
      cell: (item) => `${item.sub_scores.rsi}/20`,
    },
    {
      id: 'macd',
      header: <ColumnHeader label="MACD" description={LEGENDS.macd} />,
      cell: (item) => `${item.sub_scores.macd}/20`,
    },
    {
      id: 'bollinger',
      header: <ColumnHeader label="BB" description={LEGENDS.bb} />,
      cell: (item) => `${item.sub_scores.bollinger}/20`,
    },
    {
      id: 'moving_avg',
      header: <ColumnHeader label="MA" description={LEGENDS.ma} />,
      cell: (item) => `${item.sub_scores.moving_avg}/20`,
    },
    {
      id: 'volume',
      header: <ColumnHeader label="Vol" description={LEGENDS.volume} />,
      cell: (item) => `${item.sub_scores.volume}/20`,
    },
    {
      id: 'range',
      header: '30-Day Range',
      cell: (item) => `₹${item.projected_lower?.toFixed(0)} – ₹${item.projected_upper?.toFixed(0)}`,
    },
  ];

  return (
    <SpaceBetween size="l">
      <TickerInputForm onSubmit={handleAnalyze} loading={loading} />

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
          {/* Column Legend */}
          <Alert type="info" data-testid="column-legend">
            <strong>Column Legend:</strong>{' '}
            <strong>RSI</strong> = Relative Strength Index •{' '}
            <strong>MACD</strong> = Moving Average Convergence Divergence •{' '}
            <strong>BB</strong> = Bollinger Bands •{' '}
            <strong>MA</strong> = Moving Averages (SMA50/200) •{' '}
            <strong>Vol</strong> = Volume Trend — <em>Hover column headers for scoring details</em>
          </Alert>

          <Table
            header={
              <Header
                variant="h2"
                counter={`(${filteredResults.length} of ${results.length})`}
                description="Click a ticker for detailed breakdown. Hover column headers for indicator descriptions."
              >
                Bullish Stock Rankings
              </Header>
            }
            columnDefinitions={columnDefinitions}
            items={paginatedResults}
            sortingDisabled
            variant="full-page"
            stickyHeader
            data-testid="results-table"
            filter={
              <TextFilter
                filteringText={filterText}
                filteringPlaceholder="Filter by ticker..."
                onChange={({ detail }) => {
                  setFilterText(detail.filteringText);
                  setCurrentPage(1);
                }}
                data-testid="results-filter"
              />
            }
            pagination={
              <Pagination
                currentPageIndex={currentPage}
                pagesCount={totalPages}
                onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
                data-testid="results-pagination"
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

      {selectedTicker && (
        <StockDetailDrawer
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </SpaceBetween>
  );
}
