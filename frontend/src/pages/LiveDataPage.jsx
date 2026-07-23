import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Input,
  ColumnLayout,
  Table,
  StatusIndicator,
  Spinner,
  Alert,
  Badge,
} from '@cloudscape-design/components';
import { analyzeStocks } from '../api/stockApi';

/**
 * LiveDataPage — Fetch and display live ticker data from yfinance.
 * Separate from the analysis/scoring tab — shows raw market data for a single ticker.
 */
export default function LiveDataPage() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFetch() {
    if (!ticker.trim()) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      // Fetch live data via yfinance (single ticker analysis)
      const response = await analyzeStocks([ticker.trim().toUpperCase()]);

      const results = response.results || [];
      const failed = response.failed || [];

      if (failed.length > 0) {
        setError(`Failed to fetch ${ticker}: ${failed[0].reason}`);
        return;
      }

      if (results.length > 0) {
        setData(results[0]);
      } else {
        setError('No data returned for this ticker.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (detail && typeof detail === 'object') {
        msg = detail.message || detail.hint || JSON.stringify(detail);
      } else {
        msg = err.message || 'Failed to fetch ticker data';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleFetch();
    }
  }

  return (
    <SpaceBetween size="l">
      {/* Input Section */}
      <Container
        header={
          <Header
            variant="h2"
            description="Enter a BSE/NSE ticker to fetch live market data and indicator values"
          >
            Live Ticker Lookup
          </Header>
        }
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>Ticker Symbol</Box>
            <Input
              value={ticker}
              onChange={({ detail }) => setTicker(detail.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., RELIANCE.NS, TCS.NS, 500325.BO"
              disabled={loading}
              data-testid="live-ticker-input"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleFetch}
            disabled={!ticker.trim() || loading}
            loading={loading}
            data-testid="live-fetch-btn"
          >
            Fetch Live Data
          </Button>
        </div>
      </Container>

      {/* Error */}
      {error && (
        <Alert type="error" dismissible onDismiss={() => setError('')} data-testid="live-error">
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box textAlign="center" padding="xl">
          <Spinner size="large" />
          <Box margin={{ top: 's' }}>Fetching live data for {ticker.toUpperCase()}...</Box>
        </Box>
      )}

      {/* Results */}
      {data && (
        <SpaceBetween size="l">
          {/* Summary Cards */}
          <Container header={<Header variant="h2">{data.ticker} — Live Summary</Header>}>
            <ColumnLayout columns={4} variant="text-grid">
              <Box data-testid="live-score">
                <Box variant="awsui-key-label">Bullish Score</Box>
                <Box variant="h1">{data.bullish_score}/100</Box>
              </Box>
              <Box data-testid="live-confidence">
                <Box variant="awsui-key-label">Confidence</Box>
                <Box margin={{ top: 'xxs' }}>
                  <Badge color={{ High: 'green', Medium: 'blue', Low: 'grey' }[data.confidence] || 'grey'}>
                    {data.confidence}
                  </Badge>
                </Box>
              </Box>
              <Box data-testid="live-rsi">
                <Box variant="awsui-key-label">RSI (14)</Box>
                <Box variant="h1">{data.rsi_value?.toFixed(1)}</Box>
              </Box>
              <Box data-testid="live-range">
                <Box variant="awsui-key-label">30-Day Projected Range</Box>
                <Box variant="h2">₹{data.projected_lower?.toFixed(2)} – ₹{data.projected_upper?.toFixed(2)}</Box>
              </Box>
            </ColumnLayout>
          </Container>

          {/* Indicator Breakdown Table */}
          <Container header={<Header variant="h3">Indicator Breakdown</Header>}>
            <Table
              columnDefinitions={[
                { id: 'indicator', header: 'Indicator', cell: (item) => <strong>{item.indicator}</strong> },
                { id: 'score', header: 'Score', cell: (item) => `${item.score}/20` },
                { id: 'signal', header: 'Signal', cell: (item) => (
                  <StatusIndicator type={item.signalType}>{item.signal}</StatusIndicator>
                )},
              ]}
              items={[
                {
                  indicator: 'RSI (14)',
                  score: data.sub_scores.rsi,
                  signal: data.rsi_value <= 30 ? 'Oversold (Bullish)' : data.rsi_value >= 70 ? 'Overbought (Bearish)' : 'Neutral',
                  signalType: data.rsi_value <= 30 ? 'success' : data.rsi_value >= 70 ? 'error' : 'info',
                },
                {
                  indicator: 'MACD (12/26/9)',
                  score: data.sub_scores.macd,
                  signal: data.macd_signal_label === 'bullish' ? 'Bullish' : data.macd_signal_label === 'bearish' ? 'Bearish' : 'Neutral',
                  signalType: data.macd_signal_label === 'bullish' ? 'success' : data.macd_signal_label === 'bearish' ? 'error' : 'info',
                },
                {
                  indicator: 'Bollinger Bands (20/2σ)',
                  score: data.sub_scores.bollinger,
                  signal: data.bb_signal_label === 'oversold' ? 'Below Lower Band' : data.bb_signal_label === 'overbought' ? 'Above Upper Band' : 'Within Bands',
                  signalType: data.bb_signal_label === 'oversold' ? 'success' : data.bb_signal_label === 'overbought' ? 'error' : 'info',
                },
                {
                  indicator: 'Moving Averages (SMA50/200)',
                  score: data.sub_scores.moving_avg,
                  signal: data.ma_signal_label === 'golden_cross' ? 'Golden Cross' : data.ma_signal_label === 'above_ma' ? 'Above SMA50' : 'Below SMA50',
                  signalType: data.ma_signal_label === 'golden_cross' ? 'success' : data.ma_signal_label === 'below_ma' ? 'error' : 'info',
                },
                {
                  indicator: 'Volume Trend (5d/20d)',
                  score: data.sub_scores.volume,
                  signal: data.volume_signal_label === 'high' ? 'High Volume' : data.volume_signal_label === 'low' ? 'Low Volume' : 'Normal',
                  signalType: data.volume_signal_label === 'high' ? 'success' : data.volume_signal_label === 'low' ? 'error' : 'info',
                },
              ]}
              stripedRows
              data-testid="live-indicators-table"
            />
          </Container>

          {/* Disclaimer */}
          <Alert type="info">
            Data sourced live from yfinance. This is for informational purposes only — not investment advice.
          </Alert>
        </SpaceBetween>
      )}
    </SpaceBetween>
  );
}
