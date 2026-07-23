import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  ColumnLayout,
  Table,
  StatusIndicator,
  Spinner,
  Alert,
  Button,
} from '@cloudscape-design/components';
import {
  LineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

/**
 * RAGDashboardTab — RAG evaluation metrics dashboard.
 * Shows precision/recall/MRR trends, faithfulness/relevance bars,
 * cost tracking, and degradation alerts.
 */
export default function RAGDashboardTab() {
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [degradation, setDegradation] = useState(null);
  const [queryMetrics, setQueryMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [historyRes, latestRes, queriesRes] = await Promise.all([
        axios.get(`/api/v4/rag/evaluation/history`),
        axios.get(`/api/v4/rag/evaluation/latest`),
        axios.get(`/api/v4/rag/evaluation/queries`),
      ]);

      setHistory(historyRes.data.results || []);
      setDegradation(historyRes.data.degradation || null);
      setLatest(latestRes.data);
      setQueryMetrics(queriesRes.data || []);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        // No evaluations yet — not an error
        setError('');
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load evaluation data');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000); // Auto-refresh 5 min
    return () => clearInterval(interval);
  }, []);

  if (loading && !latest) {
    return <Spinner size="large" data-testid="rag-dashboard-loading" />;
  }

  // Prepare chart data (reverse so oldest is first)
  const chartData = [...history].reverse().map((r) => ({
    timestamp: r.timestamp?.split('T')[0] || '',
    precision: r.precision_at_k,
    recall: r.recall_at_k,
    mrr: r.mrr,
    faithfulness: r.answer_faithfulness,
    relevance: r.answer_relevance,
    context_rel: r.context_relevance,
    cost: r.cost_usd,
    tokens: r.tokens_consumed,
  }));

  return (
    <SpaceBetween size="l">
      {error && (
        <Alert type="error" dismissible onDismiss={() => setError('')} data-testid="rag-error">
          {error}
        </Alert>
      )}

      {/* Degradation Warning */}
      {degradation && (
        <Alert type="warning" data-testid="rag-degradation-alert">
          <strong>Quality Degradation Detected:</strong>{' '}
          {degradation.degradations?.map((d, i) => (
            <span key={i}>
              {d.metric} dropped {d.drop_pct}% (from {d.previous} to {d.current})
              {i < degradation.degradations.length - 1 && '; '}
            </span>
          ))}
        </Alert>
      )}

      {/* Latest Metrics Summary */}
      {latest && (
        <Container header={<Header variant="h3">Latest Evaluation</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <Box data-testid="metric-precision">
              <Box variant="awsui-key-label">Precision@K</Box>
              <Box variant="h2">{(latest.precision_at_k * 100).toFixed(1)}%</Box>
            </Box>
            <Box data-testid="metric-recall">
              <Box variant="awsui-key-label">Recall@K</Box>
              <Box variant="h2">{(latest.recall_at_k * 100).toFixed(1)}%</Box>
            </Box>
            <Box data-testid="metric-mrr">
              <Box variant="awsui-key-label">MRR</Box>
              <Box variant="h2">{latest.mrr.toFixed(3)}</Box>
            </Box>
            <Box data-testid="metric-faithfulness">
              <Box variant="awsui-key-label">Faithfulness</Box>
              <Box variant="h2">{(latest.answer_faithfulness * 100).toFixed(1)}%</Box>
            </Box>
          </ColumnLayout>
          <Box margin={{ top: 'm' }}>
            <ColumnLayout columns={4} variant="text-grid">
              <Box data-testid="metric-answer-relevance">
                <Box variant="awsui-key-label">Answer Relevance</Box>
                <Box variant="h2">{(latest.answer_relevance * 100).toFixed(1)}%</Box>
              </Box>
              <Box data-testid="metric-context-relevance">
                <Box variant="awsui-key-label">Context Relevance</Box>
                <Box variant="h2">{(latest.context_relevance * 100).toFixed(1)}%</Box>
              </Box>
              <Box data-testid="metric-duration">
                <Box variant="awsui-key-label">Duration</Box>
                <Box variant="h2">{latest.duration_seconds?.toFixed(1) || '0'}s</Box>
              </Box>
              <Box data-testid="metric-cost-summary">
                <Box variant="awsui-key-label">Cost / Tokens</Box>
                <Box variant="h2">${latest.cost_usd?.toFixed(4) || '0'} · {latest.tokens_consumed?.toLocaleString() || 0}</Box>
              </Box>
            </ColumnLayout>
          </Box>
        </Container>
      )}

      {/* Retrieval Metrics Over Time */}
      {chartData.length > 0 && (
        <Container header={<Header variant="h3">Retrieval Metrics Trend</Header>}>
          <div data-testid="retrieval-chart" style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="precision" stroke="#10b981" name="Precision@K" dot={false} />
                <Line type="monotone" dataKey="recall" stroke="#0ea5e9" name="Recall@K" dot={false} />
                <Line type="monotone" dataKey="mrr" stroke="#8b5cf6" name="MRR" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Container>
      )}

      {/* Generation Quality */}
      {chartData.length > 0 && (
        <Container header={<Header variant="h3">Generation Quality</Header>}>
          <div data-testid="generation-chart" style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ReBarChart data={chartData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="faithfulness" fill="#10b981" name="Faithfulness" />
                <Bar dataKey="relevance" fill="#0ea5e9" name="Answer Relevance" />
                <Bar dataKey="context_rel" fill="#8b5cf6" name="Context Relevance" />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Container>
      )}

      {/* Cost Tracking */}
      {latest && (
        <Container header={<Header variant="h3">Cost Tracking</Header>}>
          <ColumnLayout columns={3} variant="text-grid">
            <Box data-testid="cost-tokens">
              <Box variant="awsui-key-label">Tokens (Latest Run)</Box>
              <Box variant="h2">{latest.tokens_consumed?.toLocaleString() || 0}</Box>
            </Box>
            <Box data-testid="cost-usd">
              <Box variant="awsui-key-label">Est. Cost (Latest)</Box>
              <Box variant="h2">${latest.cost_usd?.toFixed(4) || '0.00'}</Box>
            </Box>
            <Box data-testid="cost-queries">
              <Box variant="awsui-key-label">Queries Evaluated</Box>
              <Box variant="h2">{latest.total_queries || 0}</Box>
            </Box>
          </ColumnLayout>
        </Container>
      )}

      {/* Per-Query Metrics Breakdown */}
      {queryMetrics.length > 0 && (
        <Table
          header={
            <Header variant="h3" counter={`(${queryMetrics.length} queries)`}
                    description="Per-query performance from the latest evaluation run">
              Query-wise Metric Breakdown
            </Header>
          }
          columnDefinitions={[
            { id: 'query', header: 'Query', cell: (item) => item.query, width: 280 },
            { id: 'precision', header: 'P@K', cell: (item) => `${(item.precision_at_k * 100).toFixed(0)}%` },
            { id: 'recall', header: 'R@K', cell: (item) => `${(item.recall_at_k * 100).toFixed(0)}%` },
            { id: 'mrr', header: 'MRR', cell: (item) => item.mrr.toFixed(3) },
            { id: 'faith', header: 'Faith.', cell: (item) => `${(item.faithfulness * 100).toFixed(0)}%` },
            { id: 'ans_rel', header: 'Ans.Rel', cell: (item) => `${(item.answer_relevance * 100).toFixed(0)}%` },
            { id: 'ctx_rel', header: 'Ctx.Rel', cell: (item) => `${(item.context_relevance * 100).toFixed(0)}%` },
            { id: 'retrieved', header: 'Chunks', cell: (item) => item.retrieved_count },
            { id: 'tokens', header: 'Tokens', cell: (item) => item.tokens_used },
          ]}
          items={queryMetrics}
          stripedRows
          stickyHeader
          data-testid="query-metrics-table"
        />
      )}

      {/* Evaluation History Table */}
      {history.length > 0 && (
        <Table
          header={
            <Header variant="h3" counter={`(${history.length})`}
                    actions={<Button onClick={loadData} iconName="refresh">Refresh</Button>}>
              Evaluation History
            </Header>
          }
          columnDefinitions={[
            { id: 'timestamp', header: 'Date', cell: (item) => item.timestamp?.split('T')[0] || '-' },
            { id: 'precision', header: 'P@K', cell: (item) => `${(item.precision_at_k * 100).toFixed(1)}%` },
            { id: 'recall', header: 'R@K', cell: (item) => `${(item.recall_at_k * 100).toFixed(1)}%` },
            { id: 'mrr', header: 'MRR', cell: (item) => item.mrr.toFixed(3) },
            { id: 'faith', header: 'Faithfulness', cell: (item) => `${(item.answer_faithfulness * 100).toFixed(1)}%` },
            { id: 'relevance', header: 'Relevance', cell: (item) => `${(item.answer_relevance * 100).toFixed(1)}%` },
            { id: 'tokens', header: 'Tokens', cell: (item) => item.tokens_consumed?.toLocaleString() || '0' },
            { id: 'cost', header: 'Cost', cell: (item) => `$${item.cost_usd?.toFixed(4) || '0'}` },
            { id: 'duration', header: 'Duration', cell: (item) => `${item.duration_seconds}s` },
          ]}
          items={history}
          stripedRows
          data-testid="eval-history-table"
        />
      )}
    </SpaceBetween>
  );
}
