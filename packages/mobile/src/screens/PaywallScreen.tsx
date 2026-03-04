import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Button, IconButton, List, RadioButton, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getPackages, purchasePackage, restorePurchases } from '../services/purchases';
import { useI18n } from '../i18n';
import { md3, typography, spacing, shape, elevation } from '../theme';
import { TouchableOpacity } from 'react-native';

type PlanId = 'weekly' | 'monthly' | 'yearly';

interface PricingTier {
  id: PlanId;
  labelKey: string;
  price: string;
  intervalKey: string;
  weeklyEquivalent?: string;
  badge?: string;
  trial?: string;
  savingsPercent?: number;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'weekly',
    labelKey: 'paywall.weeklyLabel',
    price: '2.99€',
    intervalKey: 'paywall.perWeek',
  },
  {
    id: 'monthly',
    labelKey: 'paywall.monthlyLabel',
    price: '9.99€',
    intervalKey: 'paywall.perMonth',
    weeklyEquivalent: '2.50€',
    savingsPercent: 16,
  },
  {
    id: 'yearly',
    labelKey: 'paywall.yearlyLabel',
    price: '49.99€',
    intervalKey: 'paywall.perYear',
    weeklyEquivalent: '0.96€',
    badge: 'paywall.bestValue',
    trial: 'paywall.freeTrial',
    savingsPercent: 68,
  },
];

const FEATURES = [
  'paywall.featureAllPredictions',
  'paywall.featureValueBets',
  'paywall.featureDetailedAnalysis',
  'paywall.featurePushAlerts',
  'paywall.featureEarlyAccess',
];

const SOCIAL_PROOF_COUNT = '12,847';

export function PaywallScreen() {
  const navigation = useNavigation();
  const { t } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly');
  const [loading, setLoading] = useState(false);

  const selectedTier = PRICING_TIERS.find((p) => p.id === selectedPlan)!;
  const hasFreeTrial = selectedTier.trial != null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const packages = await getPackages();
      const pkg = packages.find((p) =>
        p.identifier.toLowerCase().includes(selectedPlan)
      );

      if (!pkg) {
        Alert.alert(t('error.title'), t('error.generic'));
        return;
      }

      const result = await purchasePackage(pkg);
      if (result.success) {
        Alert.alert('', t('paywall.subscribe'), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.error !== 'cancelled') {
        Alert.alert(t('error.title'), result.error || t('error.generic'));
      }
    } catch {
      Alert.alert(t('error.title'), t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        Alert.alert('', t('paywall.restore'), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('', t('paywall.restore'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Close */}
      <IconButton
        icon="close"
        iconColor={md3.outline}
        size={24}
        onPress={() => navigation.goBack()}
        style={styles.closeButton}
      />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={{ fontSize: 48 }}>⚡</Text>
        </View>
        <Text style={styles.heroTitle}>{t('paywall.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('paywall.subtitle')}</Text>
      </View>

      {/* Social proof — M3 tonal chip */}
      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>
          {t('paywall.socialProof', { count: SOCIAL_PROOF_COUNT })}
        </Text>
      </View>

      {/* Feature list */}
      <View style={styles.features}>
        {FEATURES.map((featureKey) => (
          <List.Item
            key={featureKey}
            title={t(featureKey)}
            titleStyle={styles.featureText}
            left={() => (
              <View style={styles.featureCheckCircle}>
                <Icon source="check" size={14} color={md3.onPrimaryContainer} />
              </View>
            )}
            style={styles.featureRow}
          />
        ))}
      </View>

      {/* Pricing tiers */}
      <View style={styles.tiers}>
        {PRICING_TIERS.map((tier) => {
          const isSelected = selectedPlan === tier.id;
          const isYearly = tier.id === 'yearly';

          return (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierCard,
                isSelected && styles.tierCardSelected,
                isYearly && isSelected && styles.tierCardYearly,
              ]}
              onPress={() => setSelectedPlan(tier.id)}
              activeOpacity={0.7}
            >
              {tier.badge && (
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>{t(tier.badge)}</Text>
                </View>
              )}

              <View style={styles.tierRow}>
                <RadioButton
                  value={tier.id}
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedPlan(tier.id)}
                  color={isYearly && isSelected ? md3.tertiary : md3.primary}
                  uncheckedColor={md3.outline}
                />

                <View style={styles.tierInfo}>
                  <View style={styles.tierLabelRow}>
                    <Text style={[styles.tierLabel, isSelected && styles.tierLabelSelected]}>
                      {t(tier.labelKey)}
                    </Text>
                    {tier.trial && (
                      <View style={styles.trialBadge}>
                        <Text style={styles.trialText}>{t(tier.trial)}</Text>
                      </View>
                    )}
                  </View>
                  {tier.savingsPercent && (
                    <Text style={styles.tierSavings}>
                      {t('paywall.savings', { percent: String(tier.savingsPercent) })}
                    </Text>
                  )}
                </View>

                <View style={styles.tierPriceCol}>
                  <Text style={[
                    styles.tierPrice,
                    isSelected && styles.tierPriceSelected,
                    isYearly && isSelected && styles.tierPriceYearly,
                  ]}>
                    {tier.price}
                  </Text>
                  <Text style={styles.tierInterval}>{t(tier.intervalKey)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CTA — M3 filled button */}
      <Button
        mode="contained"
        onPress={handleSubscribe}
        loading={loading}
        disabled={loading}
        style={styles.ctaButton}
        contentStyle={styles.ctaButtonContent}
      >
        {hasFreeTrial ? t('paywall.trialCta') : t('paywall.subscribe')}
      </Button>

      {hasFreeTrial && (
        <Text style={styles.guarantee}>{t('paywall.guarantee')}</Text>
      )}

      <Button
        mode="text"
        onPress={handleRestore}
        style={styles.restoreButton}
        textColor={md3.primary}
      >
        {t('paywall.restore')}
      </Button>

      <Text style={styles.terms}>{t('paywall.terms')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
  },
  content: {
    paddingBottom: spacing['5xl'],
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    zIndex: 10,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing['3xl'],
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: md3.primaryContainer + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  heroTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    textAlign: 'center',
  },

  // Social proof
  socialProof: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: shape.small,
    backgroundColor: md3.primaryContainer + '40',
    alignItems: 'center',
  },
  socialProofText: {
    ...typography.bodySmall,
    color: md3.onPrimaryContainer,
    fontWeight: '500',
  },

  // Features
  features: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  featureRow: {
    paddingVertical: 0,
    minHeight: 40,
  },
  featureCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: md3.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  featureText: {
    ...typography.body,
    color: md3.onSurface,
    fontSize: 14,
  },

  // Tiers
  tiers: {
    marginHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tierCard: {
    borderRadius: shape.large,
    padding: spacing.lg,
    backgroundColor: md3.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: 'transparent',
    ...elevation.level1,
  },
  tierCardSelected: {
    borderColor: md3.primary,
    backgroundColor: md3.primaryContainer + '20',
  },
  tierCardYearly: {
    borderColor: md3.tertiary,
    backgroundColor: md3.tertiaryContainer + '20',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -11,
    right: spacing.lg,
    backgroundColor: md3.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: shape.small,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: md3.onTertiary,
    letterSpacing: 0.5,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierLabel: {
    ...typography.h3,
    color: md3.onSurfaceVariant,
  },
  tierLabelSelected: {
    color: md3.onSurface,
  },
  trialBadge: {
    backgroundColor: md3.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shape.small,
  },
  trialText: {
    fontSize: 10,
    fontWeight: '500',
    color: md3.onPrimaryContainer,
    letterSpacing: 0.1,
  },
  tierSavings: {
    ...typography.caption,
    color: md3.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  tierPriceCol: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    ...typography.score,
    fontSize: 22,
    color: md3.outline,
  },
  tierPriceSelected: {
    color: md3.primary,
  },
  tierPriceYearly: {
    color: md3.tertiary,
  },
  tierInterval: {
    ...typography.caption,
    color: md3.outline,
  },

  // CTA
  ctaButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: shape.full,
  },
  ctaButtonContent: {
    paddingVertical: 4,
  },

  // Guarantee
  guarantee: {
    ...typography.bodySmall,
    textAlign: 'center',
    color: md3.primary,
    fontWeight: '500',
    marginBottom: spacing.md,
  },

  // Restore
  restoreButton: {
    alignSelf: 'center',
  },

  // Terms
  terms: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing['4xl'],
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
