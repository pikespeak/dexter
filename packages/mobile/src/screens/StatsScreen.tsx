import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePredictionsStore } from '../stores/predictions';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius, shadows } from '../theme';

/**
 * Stats Screen — Performance tracking, Stadium Night aesthetic.
 * Big scoreboard numbers, green/red P/L coloring, trust-building disclaimer.
 */
export function StatsScreen() {
  const { performance, fetchPerformance } = usePredictionsStore();
  const { t } = useI18n();

  useEffect(() => {
    fetchPerformance();
  }, []);

  const plValue = parseFloat(performance?.averageProfitLoss || '0');
  const plColor = plValue >= 0 ? colors.pitch.green : colors.alert.red;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <Text style={styles.subtitle}>{t('stats.subtitle')}</Text>
      </View>

      <View style={styles.grid}>
        {/* Hit Rate — hero card */}
        <View style={[styles.statCard, styles.heroCard]}>
          <Text style={styles.heroValue}>{performance?.hitRate || '—'}</Text>
          <Text style={styles.statLabel}>{t('stats.hitRate')}</Text>
        </View>

        {/* P/L */}
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: plColor }]}>
            {plValue >= 0 ? '+' : ''}{performance?.averageProfitLoss || '0.00'}
          </Text>
          <Text style={styles.statLabel}>{t('stats.avgPL')}</Text>
        </View>

        {/* Total Predictions */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{performance?.totalPredictions || 0}</Text>
          <Text style={styles.statLabel}>{t('stats.predictions')}</Text>
        </View>

        {/* Correct */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{performance?.correctPredictions || 0}</Text>
          <Text style={styles.statLabel}>{t('stats.correct')}</Text>
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{t('stats.disclaimer')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing['2xl'],
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.card,
  },
  heroCard: {
    width: '47%',
    borderColor: colors.border.accent,
  },
  heroValue: {
    ...typography.display,
    color: colors.pitch.green,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.score,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.overline,
    fontSize: 10,
  },
  disclaimer: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  disclaimerText: {
    ...typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
});
