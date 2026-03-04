import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePredictionsStore } from '../stores/predictions';
import { useAuthStore } from '../stores/auth';
import { PredictionCard } from '../components/PredictionCard';
import { PredictionCardSkeleton } from '../components/SkeletonLoader';
import { ErrorState } from '../components/ErrorState';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type HomeNav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Home Screen — Today's Predictions Feed
 * Stadium Night aesthetic with conversion-optimized free user banner.
 */
export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { t } = useI18n();
  const {
    todaysPredictions,
    freePrediction,
    isLoading,
    error,
    fetchTodaysPredictions,
    fetchFreePrediction,
  } = usePredictionsStore();
  const { isAuthenticated, plan } = useAuthStore();

  const isPro = plan === 'pro' || plan === 'premium';

  useEffect(() => {
    if (isAuthenticated && isPro) {
      fetchTodaysPredictions();
    } else {
      fetchFreePrediction();
    }
  }, [isAuthenticated, plan]);

  const handleRefresh = () => {
    if (isAuthenticated && isPro) {
      fetchTodaysPredictions();
    } else {
      fetchFreePrediction();
    }
  };

  const handlePredictionPress = (matchId: string, predictionId: string) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }
    navigation.navigate('PredictionDetail', { predictionId, matchId });
  };

  const predictions = isPro ? todaysPredictions : freePrediction ? [freePrediction] : [];

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{dateStr}</Text>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.pitch.green}
          />
        }
      >
        {error && <ErrorState message={error} onRetry={handleRefresh} />}

        {/* Conversion banner for free users */}
        {!isPro && !error && (
          <View style={styles.freeBanner}>
            {/* Accent bar */}
            <View style={styles.bannerAccent} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerOverline}>{t('home.freePreview')}</Text>
              <Text style={styles.bannerText}>{t('home.freeText')}</Text>
              <TouchableOpacity
                style={styles.bannerCta}
                onPress={() => {
                  if (!isAuthenticated) {
                    navigation.navigate('Register');
                  } else {
                    navigation.navigate('Paywall');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerCtaText}>
                  {isAuthenticated
                    ? t('home.upgradeProCta', { price: '4.99€' })
                    : t('home.registerCta')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading skeletons */}
        {isLoading && predictions.length === 0 && (
          <>
            <PredictionCardSkeleton />
            <PredictionCardSkeleton />
            <PredictionCardSkeleton />
          </>
        )}

        {/* Prediction cards */}
        {predictions.map((prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            onPress={() => handlePredictionPress(prediction.match.id, prediction.id)}
          />
        ))}

        {/* Empty state */}
        {predictions.length === 0 && !isLoading && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚽</Text>
            <Text style={styles.emptyTitle}>{t('home.noPredictions')}</Text>
            <Text style={styles.emptyText}>{t('home.noPredictionsText')}</Text>
          </View>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
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
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: spacing.lg,
  },
  // Conversion banner
  freeBanner: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.accent,
    ...shadows.glow,
  },
  bannerAccent: {
    height: 3,
    backgroundColor: colors.pitch.green,
  },
  bannerContent: {
    padding: spacing.xl,
  },
  bannerOverline: {
    ...typography.overline,
    color: colors.pitch.green,
    marginBottom: spacing.sm,
  },
  bannerText: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  bannerCta: {
    backgroundColor: colors.pitch.green,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  bannerCtaText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing['4xl'],
  },
});
