import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 120000,
});

/**
 * POST /api/v1/analyze
 * Submit tickers for bullish analysis and ranking.
 * @param {string[]} tickers - Array of ticker symbols (e.g. ["RELIANCE.NS", "TCS.NS"])
 * @returns {Promise<object>} AnalyzeResponse with ranked tickers
 */
export async function analyzeStocks(tickers) {
  const response = await api.post('/analyze', { tickers });
  return response.data;
}

/**
 * GET /api/v1/ticker/{ticker}
 * Retrieve detailed analysis for a single ticker from cache.
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<object>} ScoredTicker detail
 */
export async function getTickerDetail(ticker) {
  const response = await api.get(`/ticker/${encodeURIComponent(ticker)}`);
  return response.data;
}
