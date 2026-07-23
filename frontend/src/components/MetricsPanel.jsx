import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Table,
  StatusIndicator,
  Spinner,
} from '@cloudscape-design/components';
import { getMetrics, getTickerHealth } from '../api/observabilityApi';

/**
 * MetricsPanel - Shows live metric cards in a tabular grid and ticker health table.
 * Uses CSS .metrics-grid / .metric-card classes for clean data presentation.
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
      {/* Metric cards — tabular grid layout */}
      <Container header={<Header variant="h3">Live Metrics</Header>}>
        <div className="metrics-grid" data-testid="metrics-grid">
          <div className="metric-card" data-testid="metric-total-requests">
            <div className="metric-card__label">Total Requests</div>
            <div className="metric-card__value metric-card__value--info">
              {metrics?.total_requests ?? 0}
            </div>
          </div>
          <div className="metric-card" data-testid="metric-avg-latency">
            <div className="metric-card__label">Avg Latency</div>
            <div className="metric-card__value">
              {(metrics?.avg_latency_ms ?? 0).toFixed(0)}<span style={{ fontSize: '0.9rem', fontWeight: 400, marginLeft: '2px' }}>ms</span>
            </div>
          </div>
          <div className="metric-card" data-testid="metric-cache-hits">
            <div className="metric-card__label">Cache Hits</div>
            <div className="metric-card__value metric-card__value--success">
              {metrics?.cache_hits ?? 0}
            </div>
          </div>
          <div className="metric-card" data-testid="metric-errors">
            <div className="metric-card__label">Total Errors</div>
            <div className={`metric-card__value ${(metrics?.total_errors ?? 0) > 0 ? 'metric-card__value--error' : 'metric-card__value--success'}`}>
              {metrics?.total_errors ?? 0}
            </div>
          </div>
        </div>
      </Container>

      {/* Ticker health table — tabular data display */}
      {tickerHealth.length > 0 && (
        <div className="data-table">
          <Table
            header={<Header variant="h3">Ticker Health</Header>}
            columnDefinitions={[
              { id: 'ticker', header: 'Ticker', cell: (item) => <strong>{item.ticker}</strong> },
              {
                id: 'requests',
                header: 'Requests',
                cell: (item) => item.total_requests,
              },
              {
                id: 'failures',
                header: 'Failures',
                cell: (item) => item.total_failures,
              },
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
        </div>
      )}
    </SpaceBetween>
  );
}
