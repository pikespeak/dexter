import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { usePredictionsStore } from '../stores/predictions';
import { useAuthStore } from '../stores/auth';
import { PredictionCard } from '../components/PredictionCard';

/**
 * Home Screen - Today's Predictions Feed
 * Shows prediction cards sorted by confidence, with kickoff time.
 * Free users see 1 prediction, Pro/Premium see all.
 */
export function HomeScreen() {
  const { todaysPredictions, isLoading, error, fetchTodaysPredictions, fetchFreePrediction } = usePredictionsStore();
  const { isAuthenticated, plan } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && (plan === 'pro' || plan === 'premium')) {
      fetchTodaysPredictions();
    }
  }, [isAuthenticated, plan]);

  const isPro = plan === 'pro' || plan === 'premium';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Heute</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={isPro ? fetchTodaysPredictions : undefined}
          />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isPro && (
          <View style={styles.freeBanner}>
            <Text style={styles.freeTitle}>Kostenlose Vorschau</Text>
            <Text style={styles.freeText}>
              Upgrade auf Pro für alle täglichen Vorhersagen
            </Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>Pro ab 4,99€/Monat</Text>
            </TouchableOpacity>
          </View>
        )}

        {todaysPredictions.map((prediction) => (
          <PredictionCard key={prediction.id} prediction={prediction} />
        ))}

        {todaysPredictions.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚽</Text>
            <Text style={styles.emptyTitle}>Keine Vorhersagen</Text>
            <Text style={styles.emptyText}>
              Heute stehen keine Spiele auf dem Programm.
              Schau morgen wieder vorbei!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#8888aa',
    marginTop: 4,
  },
  feed: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorBanner: {
    backgroundColor: '#3d1f1f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  freeBanner: {
    backgroundColor: '#1a1a3e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3333aa',
  },
  freeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  freeText: {
    fontSize: 14,
    color: '#8888aa',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#4444ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  upgradeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8888aa',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
