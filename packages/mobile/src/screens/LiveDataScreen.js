import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { analyzeStocks } from '../api/stockApi';

function IndicatorRow({ label, score, signal, signalType }) {
  const color = signalType === 'bullish' ? '#10b981' : signalType === 'bearish' ? '#ef4444' : '#64748b';
  return (
    <View style={styles.indicatorRow}>
      <Text style={styles.indicatorLabel}>{label}</Text>
      <Text style={styles.indicatorScore}>{score}/20</Text>
      <Text style={[styles.indicatorSignal, { color }]}>{signal}</Text>
    </View>
  );
}

export default function LiveDataScreen() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFetch() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const result = await analyzeStocks([ticker.trim().toUpperCase()]);
      const results = result.results || [];
      const failed = result.failed || [];

      if (failed.length > 0) {
        setError(`Failed: ${failed[0].reason}`);
      } else if (results.length > 0) {
        setData(results[0]);
      } else {
        setError('No data returned.');
      }
    } catch (err) {
      setError(err.response?.data?.detail?.message || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={ticker}
          onChangeText={setTicker}
          placeholder="e.g. RELIANCE.NS"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
          returnKeyType="search"
          onSubmitEditing={handleFetch}
        />
        <TouchableOpacity style={styles.fetchBtn} onPress={handleFetch} disabled={loading || !ticker.trim()}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.fetchBtnText}>Fetch</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data && (
        <View style={styles.resultCard}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.tickerName}>{data.ticker}</Text>
              <Text style={styles.range}>
                ₹{data.projected_lower?.toFixed(0)} – ₹{data.projected_upper?.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.scorePill, {
              backgroundColor: data.bullish_score >= 75 ? '#10b981' : data.bullish_score >= 50 ? '#0ea5e9' : '#f59e0b'
            }]}>
              <Text style={styles.scoreText}>{data.bullish_score}</Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>
          </View>

          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence:</Text>
            <Text style={[styles.confidenceValue, {
              color: data.confidence === 'High' ? '#10b981' : data.confidence === 'Medium' ? '#0ea5e9' : '#f59e0b'
            }]}>{data.confidence}</Text>
          </View>

          {/* Indicators Table */}
          <Text style={styles.sectionTitle}>Indicator Breakdown</Text>
          <View style={styles.table}>
            <IndicatorRow
              label="RSI (14)"
              score={data.sub_scores.rsi}
              signal={data.rsi_value <= 30 ? 'Oversold' : data.rsi_value >= 70 ? 'Overbought' : `${data.rsi_value?.toFixed(1)}`}
              signalType={data.rsi_value <= 30 ? 'bullish' : data.rsi_value >= 70 ? 'bearish' : 'neutral'}
            />
            <IndicatorRow
              label="MACD"
              score={data.sub_scores.macd}
              signal={data.macd_signal_label}
              signalType={data.macd_signal_label === 'bullish' ? 'bullish' : data.macd_signal_label === 'bearish' ? 'bearish' : 'neutral'}
            />
            <IndicatorRow
              label="Bollinger Bands"
              score={data.sub_scores.bollinger}
              signal={data.bb_signal_label}
              signalType={data.bb_signal_label === 'oversold' ? 'bullish' : data.bb_signal_label === 'overbought' ? 'bearish' : 'neutral'}
            />
            <IndicatorRow
              label="Moving Avg"
              score={data.sub_scores.moving_avg}
              signal={data.ma_signal_label === 'golden_cross' ? 'Golden Cross' : data.ma_signal_label}
              signalType={data.ma_signal_label === 'golden_cross' ? 'bullish' : data.ma_signal_label === 'below_ma' ? 'bearish' : 'neutral'}
            />
            <IndicatorRow
              label="Volume"
              score={data.sub_scores.volume}
              signal={data.volume_signal_label}
              signalType={data.volume_signal_label === 'high' ? 'bullish' : data.volume_signal_label === 'low' ? 'bearish' : 'neutral'}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0',
  },
  fetchBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  fetchBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: '#ef4444', marginBottom: 12, fontSize: 13 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, elevation: 2, shadowOpacity: 0.05, shadowRadius: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tickerName: { fontSize: 22, fontWeight: '700', color: '#134e4a' },
  range: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scorePill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  scoreText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  confidenceLabel: { fontSize: 13, color: '#64748b', marginRight: 6 },
  confidenceValue: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#134e4a', marginBottom: 10, marginTop: 8 },
  table: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  indicatorRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  indicatorLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: '#334155' },
  indicatorScore: { width: 50, fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center' },
  indicatorSignal: { width: 90, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});
