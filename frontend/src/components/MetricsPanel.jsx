import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  ColumnLayout,
  Box,
  Table,
  StatusIndicator,
  Spinner,
} from '@cloudscape-design/components';
import { getMetrics, getTickerHealth } from '../api/observabilityApi';

/**
 * MetricsPanel - Shows live metric cards and ticker health table.
 */
export default function MetricsPanel() {
  const [metrics, setMetrics] = useState(null);
  const [tickerHealth, setTickerHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [metricsData, healthData] = await Promise.all([
          getMetrics(),
          getTickerHealth(),
        ]);
        setMetrics(metricsData.summary || metricsData);
        setTickerHealth(healthData.tickers || []);
      } catch (err) {
        setError(err.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return <Spinner size="large" data-testid="metrics-loading" />;
  }

  if (error) {
    return (
      <StatusIndicator type="error" data-testid="metrics-error">
        {error}
      </StatusIndicator>
    );
  }

  return (
    <SpaceBetween size="l">
      {/* Metric cards */}
      <Container header={<Header variant="h3">Live Metrics</Header>}>
        <ColumnLayout columns={4} variant="text-grid">
          <Box data-testid="metric-total-requests">
            <Box variant="awsui-key-label">Total Requests</Box>
            <Box variant="h1">{metrics?.total_requests ?? 0}</Box>
          </Box>
          <Box data-testid="metric-avg-latency">
            <Box variant="awsui-key-label">Avg Latency</Box>
            <Box variant="h1">{(metrics?.avg_latency_ms ?? 0).toFixed(0)} ms</Box>
          </Box>
          <Box data-testid="metric-cache-hits">
            <Box variant="awsui-key-label">Cache Hits</Box>
            <Box variant="h1">{metrics?.cache_hits ?? 0}</Box>
          </Box>
          <Box data-testid="metric-errors">
            <Box variant="awsui-key-label">Total Errors</Box>
            <Box variant="h1">{metrics?.total_errors ?? 0}</Box>
          </Box>
        </ColumnLayout>
      </Container>

      {/* Ticker health table */}
      {tickerHealth.length > 0 && (
        <Table
          header={<Header variant="h3">Ticker Health</Header>}
          columnDefinitions={[
            { id: 'ticker', header: 'Ticker', cell: (item) => item.ticker },
            { id: 'requests', header: 'Requests', cell: (item) => item.total_requests },
            { id: 'failures', header: 'Failures', cell: (item) => item.total_failures },
            {
              id: 'failure_rate',
              header: 'Failure Rate',
              cell: (item) => (
                <StatusIndicator type={item.failure_rate > 0.5 ? 'error' : item.failure_rate > 0.2 ? 'warning' : 'success'}>
                  {(item.failure_rate * 100).toFixed(1)}%
                </StatusIndicator>
              ),
            },
            { id: 'last_failure', header: 'Last Failure', cell: (item) => item.last_failure_reason || '—' },
          ]}
          items={tickerHealth}
          data-testid="ticker-health-table"
        />
      )}
    </SpaceBetween>
  );
}
