import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { healthCheck, API_BASE_URL } from '../api/stockApi';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const result = await healthCheck();
      setApiStatus({ ok: true, uptime: result.uptime_seconds });
    } catch {
      setApiStatus({ ok: false });
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* User Profile */}
      <View style={styles.profileCard}>
        {user?.picture && (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>
      </View>

      {/* API Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>API Server</Text>
          <Text style={[styles.statusValue, { color: apiStatus?.ok ? '#10b981' : '#ef4444' }]}>
            {apiStatus?.ok ? '✓ Connected' : '✕ Offline'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Endpoint</Text>
          <Text style={styles.statusValueMuted}>{API_BASE_URL}</Text>
        </View>
        {apiStatus?.uptime && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Uptime</Text>
            <Text style={styles.statusValueMuted}>{Math.floor(apiStatus.uptime / 60)}m</Text>
          </View>
        )}
        <TouchableOpacity style={styles.refreshBtn} onPress={checkHealth}>
          <Text style={styles.refreshBtnText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>App Version</Text>
          <Text style={styles.statusValueMuted}>1.0.0 (MVP3)</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Indicators</Text>
          <Text style={styles.statusValueMuted}>RSI, MACD, BB, MA, Volume</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Data Source</Text>
          <Text style={styles.statusValueMuted}>yfinance (BSE/NSE)</Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        This app is for informational purposes only. Not investment advice. Data sourced from yfinance.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowOpacity: 0.05,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  userName: { fontSize: 17, fontWeight: '700', color: '#134e4a' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#134e4a', marginBottom: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statusLabel: { fontSize: 13, color: '#64748b' },
  statusValue: { fontSize: 13, fontWeight: '600' },
  statusValueMuted: { fontSize: 13, color: '#334155' },
  refreshBtn: { marginTop: 12, alignSelf: 'center' },
  refreshBtnText: { color: '#0d9488', fontWeight: '600', fontSize: 13 },
  signOutBtn: {
    backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16,
  },
  signOutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
  disclaimer: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16 },
});
