import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePredictionsStore } from '../stores/predictions';

/**
 * Stats Screen - Performance tracking
 * Shows hit rate, ROI, and prediction accuracy over time.
 * Builds trust with users by being transparent about performance.
 */
export function StatsScreen() {
  const { performance, fetchPerformance } = usePredictionsStore();

  useEffect(() => {
    fetchPerformance();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        <Text style={styles.subtitle}>Unsere Trefferquote</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{performance?.hitRate || '—'}</Text>
          <Text style={styles.statLabel}>Trefferquote</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{performance?.totalPredictions || 0}</Text>
          <Text style={styles.statLabel}>Vorhersagen</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{performance?.correctPredictions || 0}</Text>
          <Text style={styles.statLabel}>Richtig</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[
            styles.statValue,
            { color: parseFloat(performance?.averageProfitLoss || '0') >= 0 ? '#22c55e' : '#ef4444' }
          ]}>
            {performance?.averageProfitLoss || '0.00'}
          </Text>
          <Text style={styles.statLabel}>Avg. P/L</Text>
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Vergangene Ergebnisse garantieren keine zukuenftigen Gewinne.
          Alle Vorhersagen dienen der Unterhaltung und Analyse.
          Bitte wette verantwortungsvoll.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#8888aa', marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4444ff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8888aa',
  },
  disclaimer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666688',
    lineHeight: 18,
    textAlign: 'center',
  },
});
