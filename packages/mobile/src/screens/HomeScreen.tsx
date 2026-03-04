import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePredictionsStore } from '../stores/predictions';
import { useAuthStore } from '../stores/auth';
import { PredictionCard } from '../components/PredictionCard';
import { PredictionCardSkeleton } from '../components/SkeletonLoader';
import { ErrorState } from '../components/ErrorState';
import { useI18n } from '../i18n';
import { md3, typography, spacing, shape } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type HomeNav = NativeStackNavigationProp<RootStackParamList>;

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
            tintColor={md3.primary}
          />
        }
      >
        {error && <ErrorState message={error} onRetry={handleRefresh} />}

        {/* M3 Banner for free users */}
        {!isPro && !error && (
          <View style={styles.freeBanner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerOverline}>{t('home.freePreview')}</Text>
              <Text style={styles.bannerText}>{t('home.freeText')}</Text>
              <Button
                mode="contained"
                onPress={() => {
                  if (!isAuthenticated) {
                    navigation.navigate('Register');
                  } else {
                    navigation.navigate('Paywall');
                  }
                }}
                style={styles.bannerCta}
              >
                {isAuthenticated
                  ? t('home.upgradeProCta', { price: '4.99€' })
                  : t('home.registerCta')}
              </Button>
            </View>
          </View>
        )}

        {isLoading && predictions.length === 0 && (
          <>
            <PredictionCardSkeleton />
            <PredictionCardSkeleton />
            <PredictionCardSkeleton />
          </>
        )}

        {predictions.map((prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            onPress={() => handlePredictionPress(prediction.match.id, prediction.id)}
          />
        ))}

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
    backgroundColor: md3.surfaceContainerLowest,
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
    color: md3.outline,
    marginTop: spacing.xs,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: spacing.lg,
  },
  // M3 filled tonal banner
  freeBanner: {
    backgroundColor: md3.primaryContainer + '40',
    borderRadius: shape.large,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  bannerContent: {
    padding: spacing.xl,
  },
  bannerOverline: {
    ...typography.overline,
    color: md3.onPrimaryContainer,
    marginBottom: spacing.sm,
  },
  bannerText: {
    ...typography.body,
    color: md3.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  bannerCta: {
    borderRadius: shape.full,
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
