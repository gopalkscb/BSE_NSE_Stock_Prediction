import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { analyzeStocks } from '../api/stockApi';
import { cacheSet, cacheGetStale } from '../utils/storage';

const PRESET_TICKERS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
  'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LT.NS', 'KOTAKBANK.NS',
  'HINDUNILVR.NS', 'BAJFINANCE.NS', 'MARUTI.NS', 'AXISBANK.NS', 'SUNPHARMA.NS',
];

function ScoreBadge({ score }) {
  const bg = score >= 75 ? '#10b981' : score >= 50 ? '#0ea5e9' : '#f59e0b';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{score}</Text>
    </View>
  );
}

function StockCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticker}>{item.ticker}</Text>
          <Text style={styles.confidence}>{item.confidence} confidence</Text>
        </View>
        <ScoreBadge score={item.bullish_score} />
      </View>
      <View style={styles.subScores}>
        <Text style={styles.subLabel}>RSI {item.sub_scores.rsi}</Text>
        <Text style={styles.subLabel}>MACD {item.sub_scores.macd}</Text>
        <Text style={styles.subLabel}>BB {item.sub_scores.bollinger}</Text>
        <Text style={styles.subLabel}>MA {item.sub_scores.moving_avg}</Text>
        <Text style={styles.subLabel}>Vol {item.sub_scores.volume}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ScreenerScreen({ navigation }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setStale(false);

    try {
      const data = await analyzeStocks(PRESET_TICKERS);
      setResults(data.results || []);
      cacheSet('screener_results', data.results);
    } catch (err) {
      // Try cached data
      const cached = cacheGetStale('screener_results');
      if (cached) {
        setResults(cached.data);
        setStale(cached.stale);
      } else {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load on first render
  React.useEffect(() => {
    const cached = cacheGetStale('screener_results');
    if (cached) {
      setResults(cached.data);
      setStale(cached.stale);
    }
    fetchData();
  }, []);

  function handlePress(item) {
    navigation.navigate('TickerDetail', { ticker: item });
  }

  if (loading && results.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Analyzing NIFTY 15 tickers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stale && (
        <View style={styles.staleBanner}>
          <Text style={styles.staleText}>⚠️ Showing cached data (offline)</Text>
        </View>
      )}
      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.ticker}
          renderItem={({ item }) => <StockCard item={item} onPress={handlePress} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#0d9488" />
          }
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <Text style={styles.header}>Top Bullish Stocks ({results.length})</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 18, fontWeight: '700', color: '#134e4a', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  ticker: { fontSize: 16, fontWeight: '700', color: '#134e4a' },
  confidence: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  subScores: { flexDirection: 'row', marginTop: 10, gap: 8 },
  subLabel: {
    fontSize: 11, color: '#475569', backgroundColor: '#f1f5f9',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  loadingText: { marginTop: 12, color: '#64748b' },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#0d9488', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  staleBanner: { backgroundColor: '#fef3c7', padding: 8, alignItems: 'center' },
  staleText: { fontSize: 12, color: '#92400e' },
});
