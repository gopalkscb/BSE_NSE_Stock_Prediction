import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Input,
  Select,
  ColumnLayout,
  Table,
  StatusIndicator,
  Spinner,
  Alert,
  Badge,
} from '@cloudscape-design/components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const INTERVAL_OPTIONS = [
  { label: '1 Minute', value: '1min' },
  { label: '5 Minutes', value: '5min' },
  { label: '15 Minutes', value: '15min' },
  { label: '30 Minutes', value: '30min' },
  { label: '60 Minutes', value: '60min' },
];

/**
 * LiveDataPage — Intraday real-time ticker data from Alpha Vantage.
 * Shows live price, intraday indicators (RSI, MACD, VWAP), intraday trend, and price chart.
 */
export default function LiveDataPage() {
  const [ticker, setTicker] = useState('');
  const [interval, setInterval] = useState(INTERVAL_OPTIONS[1]); // default 5min
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFetch() {
    if (!ticker.trim()) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await axios.get(
        `/api/v1/intraday/${encodeURIComponent(ticker.trim().toUpperCase())}`,
        { params: { interval: interval.value } }
      );
      setData(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (detail && typeof detail === 'object') {
        msg = detail.message || JSON.stringify(detail);
      } else {
        msg = err.message || 'Failed to fetch intraday data';
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

  // Prepare chart data
  const chartData = data?.quotes?.map((q) => ({
    time: q.timestamp.split(' ')[1] || q.timestamp, // show only time part
    price: q.close,
    volume: q.volume,
  })) || [];

  return (
    <SpaceBetween size="l">
      {/* Input Section */}
      <Container
        header={
          <Header
            variant="h2"
            description="Enter a BSE/NSE ticker to fetch live intraday data from Alpha Vantage"
          >
            ⚡ Intraday Live Data
          </Header>
        }
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}>
            <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>Ticker Symbol</Box>
            <Input
              value={ticker}
              onChange={({ detail }) => setTicker(detail.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., RELIANCE.NS, TCS.NS, GOLDBEES.NS"
              disabled={loading}
              data-testid="live-ticker-input"
            />
          </div>
          <div style={{ width: '180px' }}>
            <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>Interval</Box>
            <Select
              selectedOption={interval}
              onChange={({ detail }) => setInterval(detail.selectedOption)}
              options={INTERVAL_OPTIONS}
              disabled={loading}
              data-testid="live-interval-select"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleFetch}
            disabled={!ticker.trim() || loading}
            loading={loading}
            data-testid="live-fetch-btn"
          >
            Fetch Intraday
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
          <Box margin={{ top: 's' }}>Fetching intraday data for {ticker.toUpperCase()} ({interval.value})...</Box>
        </Box>
      )}

      {/* Results */}
      {data && (
        <SpaceBetween size="l">
          {/* Price Summary Cards */}
          <Container
            header={
              <Header variant="h2" description={`Last refreshed: ${data.last_refreshed} · Source: Alpha Vantage`}>
                {data.ticker} — Intraday Summary
              </Header>
            }
          >
            <ColumnLayout columns={4} variant="text-grid">
              <Box data-testid="live-price">
                <Box variant="awsui-key-label">Last Price</Box>
                <Box variant="h1">₹{data.last_price?.toFixed(2)}</Box>
              </Box>
              <Box data-testid="live-change">
                <Box variant="awsui-key-label">Change</Box>
                <Box variant="h2" color={data.change >= 0 ? 'text-status-success' : 'text-status-error'}>
                  {data.change >= 0 ? '+' : ''}{data.change?.toFixed(2)} ({data.change_pct?.toFixed(2)}%)
                </Box>
              </Box>
              <Box data-testid="live-range">
                <Box variant="awsui-key-label">Intraday Range</Box>
                <Box variant="h2">₹{data.day_low?.toFixed(2)} – ₹{data.day_high?.toFixed(2)}</Box>
              </Box>
              <Box data-testid="live-volume">
                <Box variant="awsui-key-label">Volume</Box>
                <Box variant="h2">{data.volume?.toLocaleString()}</Box>
              </Box>
            </ColumnLayout>
          </Container>

          {/* Intraday Indicators */}
          <Container header={<Header variant="h3">Intraday Evaluation</Header>}>
            <ColumnLayout columns={4} variant="text-grid">
              <Box data-testid="live-score">
                <Box variant="awsui-key-label">Intraday Score</Box>
                <Box variant="h1">{data.intraday_score}/100</Box>
                <Badge color={{ High: 'green', Medium: 'blue', Low: 'grey' }[data.confidence] || 'grey'}>
                  {data.confidence}
                </Badge>
              </Box>
              <Box data-testid="live-trend">
                <Box variant="awsui-key-label">Intraday Trend</Box>
                <StatusIndicator
                  type={data.intraday_trend === 'bullish' ? 'success' : data.intraday_trend === 'bearish' ? 'error' : 'info'}
                >
                  {data.intraday_trend.charAt(0).toUpperCase() + data.intraday_trend.slice(1)}
                </StatusIndicator>
              </Box>
              <Box data-testid="live-rsi">
                <Box variant="awsui-key-label">Intraday RSI (14)</Box>
                <Box variant="h2">{data.intraday_rsi?.toFixed(1)}</Box>
              </Box>
              <Box data-testid="live-vwap">
                <Box variant="awsui-key-label">VWAP</Box>
                <Box variant="h2">₹{data.vwap?.toFixed(2)}</Box>
              </Box>
            </ColumnLayout>
          </Container>

          {/* Intraday Indicator Breakdown */}
          <Container header={<Header variant="h3">Intraday Indicator Breakdown</Header>}>
            <Table
              columnDefinitions={[
                { id: 'indicator', header: 'Indicator', cell: (item) => <strong>{item.indicator}</strong> },
                { id: 'value', header: 'Value', cell: (item) => item.value },
                { id: 'signal', header: 'Intraday Signal', cell: (item) => (
                  <StatusIndicator type={item.signalType}>{item.signal}</StatusIndicator>
                )},
              ]}
              items={[
                {
                  indicator: 'RSI (14)',
                  value: data.intraday_rsi?.toFixed(2),
                  signal: data.intraday_rsi <= 30 ? 'Oversold (Bullish)' : data.intraday_rsi >= 70 ? 'Overbought (Bearish)' : 'Neutral',
                  signalType: data.intraday_rsi <= 30 ? 'success' : data.intraday_rsi >= 70 ? 'error' : 'info',
                },
                {
                  indicator: 'MACD',
                  value: `${data.intraday_macd?.toFixed(4)} (Signal: ${data.intraday_macd_signal?.toFixed(4)})`,
                  signal: data.intraday_macd > data.intraday_macd_signal ? 'Bullish Crossover' : 'Bearish',
                  signalType: data.intraday_macd > data.intraday_macd_signal ? 'success' : 'error',
                },
                {
                  indicator: 'VWAP',
                  value: `₹${data.vwap?.toFixed(2)}`,
                  signal: data.last_price > data.vwap ? 'Price Above VWAP (Bullish)' : 'Price Below VWAP (Bearish)',
                  signalType: data.last_price > data.vwap ? 'success' : 'error',
                },
                {
                  indicator: 'Price Change',
                  value: `${data.change_pct?.toFixed(2)}%`,
                  signal: data.change_pct > 1 ? 'Strong Up' : data.change_pct > 0 ? 'Slight Up' : data.change_pct < -1 ? 'Strong Down' : 'Slight Down',
                  signalType: data.change_pct > 0.5 ? 'success' : data.change_pct < -0.5 ? 'error' : 'info',
                },
                {
                  indicator: 'Day Open',
                  value: `₹${data.day_open?.toFixed(2)}`,
                  signal: data.last_price > data.day_open ? 'Trading Above Open' : 'Trading Below Open',
                  signalType: data.last_price > data.day_open ? 'success' : 'error',
                },
              ]}
              stripedRows
              data-testid="live-indicators-table"
            />
          </Container>

          {/* Intraday Price Chart */}
          {chartData.length > 0 && (
            <Container header={<Header variant="h3">Intraday Price Chart ({interval.label})</Header>}>
              <div data-testid="intraday-chart" style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#0d9488" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Container>
          )}

          {/* Disclaimer */}
          <Alert type="info" data-testid="live-disclaimer">
            Data sourced from <strong>Alpha Vantage</strong> (intraday {interval.label} intervals, {data.data_points} data points).
            This is for informational purposes only — not investment advice.
          </Alert>
        </SpaceBetween>
      )}
    </SpaceBetween>
  );
}
