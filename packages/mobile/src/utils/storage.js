import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'bse-nse-cache' });

/**
 * Cache API response with TTL
 */
export function cacheSet(key, data, ttlMinutes = 30) {
  const entry = {
    data,
    timestamp: Date.now(),
    expiry: Date.now() + ttlMinutes * 60 * 1000,
  };
  storage.set(key, JSON.stringify(entry));
}

/**
 * Get cached data (returns null if expired or missing)
 */
export function cacheGet(key) {
  const raw = storage.getString(key);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expiry) {
      storage.delete(key);
      return null;
    }
    return entry.data;
  } catch {
    storage.delete(key);
    return null;
  }
}

/**
 * Get cached data even if expired (for offline mode)
 */
export function cacheGetStale(key) {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    return { data: entry.data, stale: Date.now() > entry.expiry, timestamp: entry.timestamp };
  } catch {
    return null;
  }
}

/**
 * Watchlist persistence
 */
export function getWatchlist() {
  const raw = storage.getString('watchlist');
  return raw ? JSON.parse(raw) : [];
}

export function setWatchlist(tickers) {
  storage.set('watchlist', JSON.stringify(tickers));
}

export function addToWatchlist(ticker) {
  const list = getWatchlist();
  if (!list.includes(ticker)) {
    list.push(ticker);
    setWatchlist(list);
  }
}

export function removeFromWatchlist(ticker) {
  const list = getWatchlist().filter((t) => t !== ticker);
  setWatchlist(list);
}
