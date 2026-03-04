import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getPackages, purchasePackage, restorePurchases } from '../services/purchases';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius, shadows } from '../theme';

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

/**
 * Paywall Screen — Conversion-optimized with 3-tier pricing.
 *
 * Weekly (hook), Monthly (default), Yearly (best value + trial).
 * Trial attached to yearly only — drives annual commitment.
 * Social proof + feature list + guarantee text.
 */
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
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>{t('paywall.close')}</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={{ fontSize: 48 }}>⚡</Text>
        </View>
        <Text style={styles.heroTitle}>{t('paywall.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('paywall.subtitle')}</Text>
      </View>

      {/* Social proof */}
      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>
          {t('paywall.socialProof', { count: SOCIAL_PROOF_COUNT })}
        </Text>
      </View>

      {/* Feature list */}
      <View style={styles.features}>
        {FEATURES.map((featureKey) => (
          <View key={featureKey} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{t(featureKey)}</Text>
          </View>
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
              {/* Best value / trial badges */}
              {tier.badge && (
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>{t(tier.badge)}</Text>
                </View>
              )}

              <View style={styles.tierRow}>
                {/* Radio indicator */}
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>

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

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, loading && styles.ctaDisabled]}
        onPress={handleSubscribe}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} />
        ) : (
          <Text style={styles.ctaText}>
            {hasFreeTrial ? t('paywall.trialCta') : t('paywall.subscribe')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Guarantee text */}
      {hasFreeTrial && (
        <Text style={styles.guarantee}>{t('paywall.guarantee')}</Text>
      )}

      {/* Restore */}
      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
      </TouchableOpacity>

      {/* Terms */}
      <Text style={styles.terms}>{t('paywall.terms')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    paddingBottom: spacing['5xl'],
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: spacing.xl,
    zIndex: 10,
    padding: spacing.sm,
  },
  closeText: {
    ...typography.bodySmall,
    color: colors.text.muted,
    fontWeight: '600',
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
    backgroundColor: colors.pitch.greenFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    ...shadows.glow,
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
    borderRadius: radius.md,
    backgroundColor: colors.pitch.greenFaint,
    borderWidth: 1,
    borderColor: colors.border.accent,
    alignItems: 'center',
  },
  socialProofText: {
    ...typography.bodySmall,
    color: colors.pitch.green,
    fontWeight: '600',
  },

  // Features
  features: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureCheck: {
    color: colors.pitch.green,
    fontSize: 16,
    fontWeight: '700',
  },
  featureText: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 15,
  },

  // Tiers
  tiers: {
    marginHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tierCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.bg.card,
    borderWidth: 2,
    borderColor: colors.border.subtle,
  },
  tierCardSelected: {
    borderColor: colors.pitch.green,
  },
  tierCardYearly: {
    borderColor: colors.gold.primary,
    ...shadows.goldGlow,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -11,
    right: spacing.lg,
    backgroundColor: colors.gold.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.inverse,
    letterSpacing: 0.8,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.pitch.green,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.pitch.green,
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
    color: colors.text.secondary,
  },
  tierLabelSelected: {
    color: colors.text.primary,
  },
  trialBadge: {
    backgroundColor: colors.pitch.greenFaint,
    borderWidth: 1,
    borderColor: colors.border.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  trialText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.pitch.green,
    letterSpacing: 0.3,
  },
  tierSavings: {
    ...typography.caption,
    color: colors.pitch.green,
    fontWeight: '600',
    marginTop: 2,
  },
  tierPriceCol: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    ...typography.score,
    fontSize: 22,
    color: colors.text.muted,
  },
  tierPriceSelected: {
    color: colors.pitch.green,
  },
  tierPriceYearly: {
    color: colors.gold.primary,
  },
  tierInterval: {
    ...typography.caption,
    color: colors.text.muted,
  },

  // CTA
  ctaButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: colors.pitch.green,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.glow,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 17,
  },

  // Guarantee
  guarantee: {
    ...typography.bodySmall,
    textAlign: 'center',
    color: colors.pitch.green,
    fontWeight: '600',
    marginBottom: spacing.md,
  },

  // Restore
  restoreButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  restoreText: {
    ...typography.bodySmall,
    color: colors.pitch.green,
    fontWeight: '600',
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
