import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { usePredictionsStore } from '../stores/predictions';
import { useI18n } from '../i18n';
import { md3, typography, spacing, shape } from '../theme';

export function StatsScreen() {
  const { performance, fetchPerformance } = usePredictionsStore();
  const { t } = useI18n();

  useEffect(() => {
    fetchPerformance();
  }, []);

  const plValue = parseFloat(performance?.averageProfitLoss || '0');
  const plColor = plValue >= 0 ? md3.primary : md3.error;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <Text style={styles.subtitle}>{t('stats.subtitle')}</Text>
      </View>

      <View style={styles.grid}>
        {/* Hit Rate — hero card */}
        <Card mode="elevated" style={[styles.statCard, styles.heroCard]}>
          <Card.Content style={styles.statCardContent}>
            <Text style={styles.heroValue}>{performance?.hitRate || '—'}</Text>
            <Text style={styles.statLabel}>{t('stats.hitRate')}</Text>
          </Card.Content>
        </Card>

        {/* P/L */}
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Text style={[styles.statValue, { color: plColor }]}>
              {plValue >= 0 ? '+' : ''}{performance?.averageProfitLoss || '0.00'}
            </Text>
            <Text style={styles.statLabel}>{t('stats.avgPL')}</Text>
          </Card.Content>
        </Card>

        {/* Total Predictions */}
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Text style={styles.statValue}>{performance?.totalPredictions || 0}</Text>
            <Text style={styles.statLabel}>{t('stats.predictions')}</Text>
          </Card.Content>
        </Card>

        {/* Correct */}
        <Card mode="elevated" style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <Text style={styles.statValue}>{performance?.correctPredictions || 0}</Text>
            <Text style={styles.statLabel}>{t('stats.correct')}</Text>
          </Card.Content>
        </Card>
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
    backgroundColor: md3.surfaceContainerLowest,
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
    color: md3.outline,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    borderRadius: shape.large,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroCard: {
    backgroundColor: md3.primaryContainer + '40',
  },
  heroValue: {
    ...typography.display,
    color: md3.primary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.score,
    color: md3.onSurface,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.overline,
    fontSize: 10,
  },
  disclaimer: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: md3.surfaceContainer,
    borderRadius: shape.medium,
  },
  disclaimerText: {
    ...typography.caption,
    lineHeight: 16,
    textAlign: 'center',
  },
});
