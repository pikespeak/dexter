import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useI18n } from '../i18n';
import { md3, typography, spacing, shape } from '../theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Error state — M3 design.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon source="alert-circle" size={28} color={md3.onErrorContainer} />
      </View>
      <Text style={styles.title}>{t('error.title')}</Text>
      <Text style={styles.message}>{message || t('error.generic')}</Text>
      {onRetry && (
        <Button mode="contained" onPress={onRetry} style={styles.retryButton}>
          {t('error.retry')}
        </Button>
      )}
    </View>
  );
}

/**
 * Offline state banner — M3 error container.
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
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: md3.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: shape.full,
  },
  offlineBanner: {
    backgroundColor: md3.errorContainer,
    padding: spacing.md,
    alignItems: 'center',
  },
  offlineText: {
    color: md3.onErrorContainer,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
});
