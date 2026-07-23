import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Default to local dev — change this for production
const API_BASE_URL = 'http://10.0.2.2:8000'; // Android emulator → localhost
// const API_BASE_URL = 'http://localhost:8000'; // iOS simulator

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Secure store unavailable — continue without auth header
  }
  return config;
});

/**
 * Analyze multiple tickers — bulk scoring
 */
export async function analyzeStocks(tickers) {
  const response = await api.post('/api/v1/analyze', { tickers });
  return response.data;
}

/**
 * Get cached ticker detail
 */
export async function getTickerDetail(ticker) {
  const response = await api.get(`/api/v1/ticker/${encodeURIComponent(ticker)}`);
  return response.data;
}

/**
 * Health check
 */
export async function healthCheck() {
  const response = await api.get('/health');
  return response.data;
}

export { api, API_BASE_URL };
