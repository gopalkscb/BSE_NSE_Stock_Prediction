import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/observability',
  timeout: 30000,
});

/**
 * GET /api/v1/observability/metrics
 * Fetch aggregated request metrics.
 * @returns {Promise<object>} Metrics summary
 */
export async function getMetrics() {
  const response = await api.get('/metrics');
  return response.data;
}

/**
 * GET /api/v1/observability/metrics?name=<metric_name>
 * Fetch filtered metric events by metric name.
 * @param {string} name - Metric name filter (request_count, request_duration_ms, cache_hit, cache_miss)
 * @param {number} [limit=50] - Max entries
 * @param {number} [offset=0] - Pagination offset
 * @returns {Promise<object>} Filtered metric events
 */
export async function getMetricsByName(name, limit = 50, offset = 0) {
  const response = await api.get('/metrics', { params: { name, limit, offset } });
  return response.data;
}

/**
 * GET /api/v1/observability/errors
 * Fetch paginated error logs.
 * @param {number} [limit=50] - Max entries
 * @param {number} [offset=0] - Pagination offset
 * @param {string} [level] - Filter by level: ERROR or WARNING
 * @returns {Promise<object>} Error log entries
 */
export async function getErrors(limit = 50, offset = 0, level = null) {
  const params = { limit, offset };
  if (level) params.level = level;
  const response = await api.get('/errors', { params });
  return response.data;
}

/**
 * GET /api/v1/observability/ticker-health
 * Fetch per-ticker fetch success/failure stats.
 * @returns {Promise<object>} Ticker health records
 */
export async function getTickerHealth() {
  const response = await api.get('/ticker-health');
  return response.data;
}

/**
 * GET /api/v1/observability/faq
 * Fetch FAQ knowledge base entries.
 * @returns {Promise<object>} FAQ categories and entries
 */
export async function getFaq() {
  const response = await api.get('/faq');
  return response.data;
}
