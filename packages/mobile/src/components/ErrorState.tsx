import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius } from '../theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Error state component — Stadium Night aesthetic.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>{t('error.title')}</Text>
      <Text style={styles.message}>{message || t('error.generic')}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>{t('error.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Offline state banner.
 */
export function OfflineState() {
  const { t } = useI18n();

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>{t('error.offline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing['4xl'],
    paddingTop: spacing['5xl'],
  },
  icon: {
    fontSize: 48,
    color: colors.alert.red,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.pitch.green,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 14,
  },
  offlineBanner: {
    backgroundColor: colors.alert.redFaint,
    borderBottomWidth: 1,
    borderBottomColor: colors.alert.redMuted,
    padding: spacing.md,
    alignItems: 'center',
  },
  offlineText: {
    color: colors.alert.red,
    fontSize: 13,
    fontWeight: '500',
  },
});
