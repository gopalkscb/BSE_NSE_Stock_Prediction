import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert,
} from 'react-native';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

export default function WatchlistScreen({ navigation }) {
  const [watchlist, setWatchlistState] = useState([]);
  const [newTicker, setNewTicker] = useState('');

  useFocusEffect(
    useCallback(() => {
      setWatchlistState(getWatchlist());
    }, [])
  );

  function handleAdd() {
    const t = newTicker.trim().toUpperCase();
    if (!t) return;
    if (watchlist.includes(t)) {
      Alert.alert('Duplicate', `${t} is already in your watchlist.`);
      return;
    }
    addToWatchlist(t);
    setWatchlistState(getWatchlist());
    setNewTicker('');
  }

  function handleRemove(ticker) {
    Alert.alert('Remove', `Remove ${ticker} from watchlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeFromWatchlist(ticker);
          setWatchlistState(getWatchlist());
        },
      },
    ]);
  }

  function handlePress(ticker) {
    navigation.navigate('LiveData', { prefill: ticker });
  }

  return (
    <View style={styles.container}>
      {/* Add ticker input */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newTicker}
          onChangeText={setNewTicker}
          placeholder="Add ticker (e.g. TCS.NS)"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={!newTicker.trim()}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {watchlist.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
          <Text style={styles.emptyText}>Add tickers above to track them here.</Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
              <Text style={styles.cardTicker}>{item}</Text>
              <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <Text style={styles.header}>Watchlist ({watchlist.length})</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  addRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 0 },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0',
  },
  addBtn: { backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#334155' },
  emptyText: { fontSize: 13, color: '#64748b', marginTop: 4 },
  header: { fontSize: 16, fontWeight: '700', color: '#134e4a', marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8,
    elevation: 1, shadowOpacity: 0.03, shadowRadius: 4,
  },
  cardTicker: { fontSize: 15, fontWeight: '600', color: '#134e4a' },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 16, color: '#ef4444', fontWeight: '700' },
});
