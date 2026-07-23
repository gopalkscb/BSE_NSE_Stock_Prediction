import React from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  ColumnLayout,
  Badge,
  StatusIndicator,
  Table,
  Alert,
  Button,
} from '@cloudscape-design/components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function confidenceBadge(confidence) {
  const colorMap = { High: 'green', Medium: 'blue', Low: 'grey' };
  return <Badge color={colorMap[confidence] || 'grey'}>{confidence}</Badge>;
}

function signalIndicator(label) {
  const map = {
    bullish: { type: 'success', text: 'Bullish' },
    neutral: { type: 'info', text: 'Neutral' },
    bearish: { type: 'error', text: 'Bearish' },
    oversold: { type: 'success', text: 'Oversold (Bullish)' },
    overbought: { type: 'error', text: 'Overbought (Bearish)' },
    golden_cross: { type: 'success', text: 'Golden Cross' },
    above_ma: { type: 'info', text: 'Above MA' },
    below_ma: { type: 'error', text: 'Below MA' },
    high: { type: 'success', text: 'High Volume' },
    normal: { type: 'info', text: 'Normal' },
    low: { type: 'error', text: 'Low Volume' },
  };
  const info = map[label] || { type: 'info', text: label };
  return <StatusIndicator type={info.type}>{info.text}</StatusIndicator>;
}

/**
 * StockDetailSection — Shows full indicator breakdown and 90-day price chart
 * as an inline section (Container) below the results table.
 * NOT a Drawer overlay — all content visible on the same page without truncation.
 *
 * @param {{ ticker: object|null, onClose: () => void }} props
 */
export default function StockDetailDrawer({ ticker, onClose }) {
  if (!ticker) return null;

  const chartData = (ticker.ohlcv_90d || []).map((d) => ({
    date: d.date || d.Date,
    close: d.close || d.Close,
    sma50: d.sma_50 || d.SMA_50,
    sma200: d.sma_200 || d.SMA_200,
  }));

  const subScoreItems = [
    { indicator: 'RSI (14)', score: `${ticker.sub_scores.rsi}/20`, signal: signalIndicator(ticker.rsi_value <= 30 ? 'bullish' : ticker.rsi_value >= 70 ? 'bearish' : 'neutral') },
    { indicator: 'MACD (12/26/9)', score: `${ticker.sub_scores.macd}/20`, signal: signalIndicator(ticker.macd_signal_label) },
    { indicator: 'Bollinger Bands', score: `${ticker.sub_scores.bollinger}/20`, signal: signalIndicator(ticker.bb_signal_label) },
    { indicator: 'Moving Averages', score: `${ticker.sub_scores.moving_avg}/20`, signal: signalIndicator(ticker.ma_signal_label) },
    { indicator: 'Volume Trend', score: `${ticker.sub_scores.volume}/20`, signal: signalIndicator(ticker.volume_signal_label) },
  ];

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button onClick={onClose} variant="icon" iconName="close" ariaLabel="Close detail section" />
          }
        >
          {ticker.ticker} — Full Indicator Breakdown
        </Header>
      }
      data-testid="stock-detail-section"
    >
      <SpaceBetween size="l">
        {/* Summary */}
        <ColumnLayout columns={3}>
          <Box>
            <Box variant="awsui-key-label">Bullish Score</Box>
            <Box variant="h1" data-testid="detail-score">
              {ticker.bullish_score}/100
            </Box>
          </Box>
          <Box>
            <Box variant="awsui-key-label">Confidence</Box>
            <Box>{confidenceBadge(ticker.confidence)}</Box>
          </Box>
          <Box>
            <Box variant="awsui-key-label">30-Day Projected Range</Box>
            <Box data-testid="detail-range">
              ₹{ticker.projected_lower?.toFixed(2)} – ₹{ticker.projected_upper?.toFixed(2)}
            </Box>
          </Box>
        </ColumnLayout>

        {/* Sub-scores table */}
        <Table
          header={<Header variant="h3">Indicator Breakdown</Header>}
          columnDefinitions={[
            { id: 'indicator', header: 'Indicator', cell: (item) => item.indicator },
            { id: 'score', header: 'Score', cell: (item) => item.score },
            { id: 'signal', header: 'Signal', cell: (item) => item.signal },
          ]}
          items={subScoreItems}
          data-testid="indicator-table"
        />

        {/* 90-day price chart — full width, no height constraint */}
        {chartData.length > 0 && (
          <Box>
            <Header variant="h3">90-Day Price Chart</Header>
            <div data-testid="price-chart" style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="close" stroke="#0073bb" name="Close" dot={false} />
                  <Line type="monotone" dataKey="sma50" stroke="#ff9900" name="SMA-50" dot={false} />
                  <Line type="monotone" dataKey="sma200" stroke="#d13212" name="SMA-200" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Box>
        )}

        {/* Disclaimer */}
        <Alert type="info">
          This analysis is for informational purposes only. It is not financial advice.
          Data as of the most recent trading day available from yfinance.
        </Alert>
      </SpaceBetween>
    </Container>
  );
}
