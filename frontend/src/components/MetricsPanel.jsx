import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Table,
  StatusIndicator,
  Spinner,
  Pagination,
  Button,
  Modal,
} from '@cloudscape-design/components';
import { getMetrics, getMetricsByName, getErrors, getTickerHealth } from '../api/observabilityApi';

const DETAIL_PAGE_SIZE = 10;

/**
 * MetricsPanel - Shows live metric cards for the current month.
 * Clicking a metric number opens a paginated drill-down showing the detail records.
 * Data auto-refreshes every 30s and resets at month boundaries.
 */
export default function MetricsPanel() {
  const [metrics, setMetrics] = useState(null);
  const [recentMetrics, setRecentMetrics] = useState([]);
  const [tickerHealth, setTickerHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drill-down state
  const [drillDown, setDrillDown] = useState(null); // 'requests' | 'errors' | 'cache' | null
  const [drillData, setDrillData] = useState([]);
  const [drillTotal, setDrillTotal] = useState(0);
  const [drillPage, setDrillPage] = useState(1);
  const [drillLoading, setDrillLoading] = useState(false);

  // Month tracking for auto-reset
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsData, healthData] = await Promise.all([
        getMetrics(),
        getTickerHealth(),
      ]);
      setMetrics(metricsData.summary || metricsData);
      setRecentMetrics(metricsData.recent || []);
      setTickerHealth(healthData.tickers || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s + month boundary check
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getMonth() !== currentMonth) {
        // Month changed — reset view
        setCurrentMonth(now.getMonth());
        setDrillDown(null);
        setDrillData([]);
      }
      loadMetrics();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics, currentMonth]);

  // Load drill-down data
  async function openDrillDown(type) {
    setDrillDown(type);
    setDrillPage(1);
    await loadDrillData(type, 1);
  }

  async function loadDrillData(type, page) {
    setDrillLoading(true);
    try {
      const offset = (page - 1) * DETAIL_PAGE_SIZE;

      if (type === 'errors') {
        // Fetch only ERROR level entries
        const data = await getErrors(DETAIL_PAGE_SIZE, offset, 'ERROR');
        setDrillData(data.entries || []);
        setDrillTotal(data.total_count || 0);
      } else if (type === 'requests') {
        // Fetch only request_count metric events
        const data = await getMetricsByName('request_count', DETAIL_PAGE_SIZE, offset);
        setDrillData(data.recent || []);
        setDrillTotal(metrics?.total_requests || data.recent?.length || 0);
      } else if (type === 'cache') {
        // Fetch only cache_hit metric events
        const data = await getMetricsByName('cache_hit', DETAIL_PAGE_SIZE, offset);
        setDrillData(data.recent || []);
        setDrillTotal(metrics?.cache_hits || data.recent?.length || 0);
      } else if (type === 'latency') {
        // Fetch only request_duration_ms metric events
        const data = await getMetricsByName('request_duration_ms', DETAIL_PAGE_SIZE, offset);
        setDrillData(data.recent || []);
        setDrillTotal(data.recent?.length || 0);
      }
    } catch (err) {
      setDrillData([]);
      setDrillTotal(0);
    } finally {
      setDrillLoading(false);
    }
  }

  function handleDrillPageChange(page) {
    setDrillPage(page);
    loadDrillData(drillDown, page);
  }

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

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <SpaceBetween size="l">
      {/* Metric cards — clickable numbers */}
      <Container
        header={
          <Header variant="h3" description={`Data for ${monthName} · Click any metric for details`}>
            Live Metrics
          </Header>
        }
      >
        <div className="metrics-grid" data-testid="metrics-grid">
          <div
            className="metric-card metric-card--clickable"
            data-testid="metric-total-requests"
            onClick={() => openDrillDown('requests')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-card__label">Total Requests</div>
            <div className="metric-card__value metric-card__value--info">
              {metrics?.total_requests ?? 0}
            </div>
            <div className="metric-card__hint">Click for details →</div>
          </div>
          <div
            className="metric-card metric-card--clickable"
            data-testid="metric-avg-latency"
            onClick={() => openDrillDown('latency')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-card__label">Avg Latency</div>
            <div className="metric-card__value">
              {(metrics?.avg_latency_ms ?? 0).toFixed(0)}<span style={{ fontSize: '0.9rem', fontWeight: 400, marginLeft: '2px' }}>ms</span>
            </div>
            <div className="metric-card__hint">Click for details →</div>
          </div>
          <div
            className="metric-card metric-card--clickable"
            data-testid="metric-cache-hits"
            onClick={() => openDrillDown('cache')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-card__label">Cache Hits</div>
            <div className="metric-card__value metric-card__value--success">
              {metrics?.cache_hits ?? 0}
            </div>
            <div className="metric-card__hint">Click for details →</div>
          </div>
          <div
            className="metric-card metric-card--clickable"
            data-testid="metric-errors"
            onClick={() => openDrillDown('errors')}
            role="button"
            tabIndex={0}
          >
            <div className="metric-card__label">Total Errors</div>
            <div className={`metric-card__value ${(metrics?.total_errors ?? 0) > 0 ? 'metric-card__value--error' : 'metric-card__value--success'}`}>
              {metrics?.total_errors ?? 0}
            </div>
            <div className="metric-card__hint">Click for details →</div>
          </div>
        </div>
      </Container>

      {/* Drill-down Detail Panel */}
      {drillDown && (
        <Container
          header={
            <Header
              variant="h3"
              actions={<Button variant="normal" onClick={() => setDrillDown(null)}>Close</Button>}
            >
              {drillDown === 'errors' ? '⚠️ Error Details' :
               drillDown === 'requests' ? '📋 Request Details' :
               drillDown === 'latency' ? '⏱️ Latency Details' :
               '💾 Cache Details'}
            </Header>
          }
          data-testid="drill-down-panel"
        >
          {drillLoading ? (
            <Spinner size="normal" />
          ) : drillDown === 'errors' ? (
            <SpaceBetween size="s">
              <Table
                columnDefinitions={[
                  { id: 'timestamp', header: 'Time', cell: (item) => item.timestamp, width: 180 },
                  {
                    id: 'level', header: 'Level', width: 100,
                    cell: (item) => (
                      <StatusIndicator type={item.level === 'ERROR' ? 'error' : 'warning'}>
                        {item.level}
                      </StatusIndicator>
                    ),
                  },
                  { id: 'source', header: 'Source', cell: (item) => item.source_module, width: 150 },
                  { id: 'message', header: 'Message', cell: (item) => item.message },
                ]}
                items={drillData}
                stripedRows
                empty="No errors recorded this month."
                data-testid="drill-errors-table"
              />
              <Pagination
                currentPageIndex={drillPage}
                pagesCount={Math.ceil(drillTotal / DETAIL_PAGE_SIZE) || 1}
                onChange={({ detail }) => handleDrillPageChange(detail.currentPageIndex)}
                data-testid="drill-pagination"
              />
            </SpaceBetween>
          ) : (
            <SpaceBetween size="s">
              <Table
                columnDefinitions={[
                  { id: 'timestamp', header: 'Time', cell: (item) => item.timestamp || '-', width: 180 },
                  { id: 'name', header: 'Metric', cell: (item) => item.metric_name || drillDown, width: 160 },
                  { id: 'value', header: 'Value', cell: (item) => {
                    if (drillDown === 'latency') return `${item.metric_value?.toFixed(1) ?? '-'} ms`;
                    return item.metric_value ?? '-';
                  }},
                  { id: 'endpoint', header: 'Endpoint', cell: (item) => item.labels?.path || item.labels?.endpoint || '-' },
                  { id: 'details', header: 'Details', cell: (item) => {
                    if (!item.labels) return '-';
                    const { path, endpoint, ...rest } = item.labels;
                    const entries = Object.entries(rest);
                    return entries.length > 0 ? entries.map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
                  }},
                ]}
                items={drillData}
                stripedRows
                empty={`No ${drillDown} records for this month.`}
                data-testid="drill-detail-table"
              />
              {drillTotal > DETAIL_PAGE_SIZE && (
                <Pagination
                  currentPageIndex={drillPage}
                  pagesCount={Math.ceil(drillTotal / DETAIL_PAGE_SIZE) || 1}
                  onChange={({ detail }) => handleDrillPageChange(detail.currentPageIndex)}
                  data-testid="drill-pagination"
                />
              )}
            </SpaceBetween>
          )}
        </Container>
      )}

      {/* Ticker health table */}
      {tickerHealth.length > 0 && (
        <div className="data-table">
          <Table
            header={<Header variant="h3">Ticker Health</Header>}
            columnDefinitions={[
              { id: 'ticker', header: 'Ticker', cell: (item) => <strong>{item.ticker}</strong> },
              { id: 'requests', header: 'Requests', cell: (item) => item.total_requests },
              { id: 'failures', header: 'Failures', cell: (item) => item.total_failures },
              {
                id: 'failure_rate', header: 'Failure Rate',
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

      {/* Month info footer */}
      <Box fontSize="body-s" color="text-status-inactive" textAlign="center">
        Showing data for <strong>{monthName}</strong> · Metrics auto-reset at the start of each month · Auto-refreshes every 30s
      </Box>
    </SpaceBetween>
  );
}
