import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>📈</Text>
        <Text style={styles.title}>Bullish Stock Predictor</Text>
        <Text style={styles.subtitle}>BSE & NSE Technical Analysis</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in to continue</Text>
        <Text style={styles.cardText}>
          Access real-time stock scoring, technical indicators, and AI-powered insights for Indian equity markets.
        </Text>

        <TouchableOpacity style={styles.googleBtn} onPress={signIn}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Only authorized Gmail accounts can access this app.
        </Text>
      </View>

      <Text style={styles.footer}>
        Powered by yfinance · Pinecone RAG · OpenAI
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#134e4a',
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#0d9488',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#134e4a',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 12,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  note: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    fontSize: 11,
    color: '#94a3b8',
  },
});
