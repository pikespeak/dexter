import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth';
import { useReferralStore } from '../stores/referral';
import { useI18n, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '../i18n';
import { colors, typography, spacing, radius, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;

const LOCALES: Locale[] = ['en', 'de', 'fr', 'es', 'it'];

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { user, isAuthenticated, plan, logout } = useAuthStore();
  const { t, locale, setLocale } = useI18n();
  const { invitedCount, goal, isCompleted, restore: restoreReferral, shareInvite } = useReferralStore();
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    restoreReferral();
  }, []);

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('profile.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleShare = () => {
    const message = t('referral.shareMessage', { link: 'https://pikspeak.app/invite' });
    shareInvite(message);
  };

  const planLabel: Record<string, string> = { free: 'Free', pro: 'Pro', premium: 'Premium' };
  const planColor: Record<string, string> = {
    free: colors.text.muted,
    pro: colors.pitch.green,
    premium: colors.gold.primary,
  };

  // Progress bar width
  const progressPercent = Math.min((invitedCount / goal) * 100, 100);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>
        <View style={styles.loginPrompt}>
          <View style={styles.loginIcon}>
            <Text style={{ fontSize: 48 }}>👤</Text>
          </View>
          <Text style={styles.loginText}>{t('profile.loginPrompt')}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('profile.login')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>{t('profile.register')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      {/* User info */}
      <View style={styles.section}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Referral Card */}
      <View style={styles.section}>
        <View style={[styles.referralCard, isCompleted && styles.referralCardCompleted]}>
          <View style={styles.referralTop}>
            <View>
              <Text style={styles.referralTitle}>{t('referral.title')}</Text>
              <Text style={styles.referralSub}>
                {isCompleted
                  ? t('referral.completed')
                  : t('referral.subtitle', { count: String(goal) })}
              </Text>
            </View>
            <View style={styles.referralReward}>
              <Text style={styles.referralRewardIcon}>{isCompleted ? '🏆' : '🎁'}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {t('referral.progress', { current: String(invitedCount), total: String(goal) })}
          </Text>

          {/* Share CTA */}
          {!isCompleted && (
            <TouchableOpacity
              style={styles.shareCta}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={styles.shareCtaText}>{t('referral.shareCta')}</Text>
            </TouchableOpacity>
          )}

          {isCompleted && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardBadgeText}>{t('referral.reward')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.subscription')}</Text>
        <View style={styles.planCard}>
          <View style={[styles.planBadge, { backgroundColor: (planColor[plan] || colors.text.muted) + '20' }]}>
            <Text style={[styles.planBadgeText, { color: planColor[plan] || colors.text.muted }]}>
              {planLabel[plan] || 'Free'}
            </Text>
          </View>
          {plan === 'free' && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Paywall')}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeText}>{t('profile.upgradePro')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>{t('profile.pushNotifications')}</Text>
          <Text style={styles.settingsValue}>{t('common.on')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => setShowLangPicker(!showLangPicker)}
        >
          <Text style={styles.settingsLabel}>{t('profile.language')}</Text>
          <Text style={styles.settingsValue}>
            {LOCALE_FLAGS[locale]} {LOCALE_LABELS[locale]}
          </Text>
        </TouchableOpacity>

        {showLangPicker && (
          <View style={styles.langPicker}>
            {LOCALES.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.langOption, locale === loc && styles.langOptionActive]}
                onPress={() => {
                  setLocale(loc);
                  setShowLangPicker(false);
                }}
              >
                <Text style={styles.langFlag}>{LOCALE_FLAGS[loc]}</Text>
                <Text
                  style={[styles.langLabel, locale === loc && styles.langLabelActive]}
                >
                  {LOCALE_LABELS[loc]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>{t('profile.privacy')}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>{t('profile.terms')}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{t('profile.version', { version: '0.1.0' })}</Text>
    </ScrollView>
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
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.overline,
    marginBottom: spacing.md,
  },

  // User info
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.pitch.greenFaint,
    borderWidth: 2,
    borderColor: colors.pitch.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.pitch.green,
  },
  userName: {
    ...typography.h3,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },

  // Referral card
  referralCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border.accent,
    ...shadows.glow,
  },
  referralCardCompleted: {
    borderColor: colors.gold.muted,
    ...shadows.goldGlow,
  },
  referralTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  referralTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  referralSub: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    maxWidth: 220,
  },
  referralReward: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pitch.greenFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralRewardIcon: {
    fontSize: 22,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.pitch.green,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  shareCta: {
    backgroundColor: colors.pitch.green,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  shareCtaText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 14,
  },
  rewardBadge: {
    backgroundColor: colors.gold.faint,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rewardBadgeText: {
    ...typography.button,
    color: colors.gold.primary,
    fontSize: 14,
  },

  // Plan card
  planCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  planBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  planBadgeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  upgradeButton: {
    backgroundColor: colors.pitch.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  upgradeText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 13,
  },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  settingsLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 16,
  },
  settingsValue: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
  chevron: {
    fontSize: 20,
    color: colors.text.muted,
    fontWeight: '300',
  },

  // Language picker
  langPicker: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  langOptionActive: {
    backgroundColor: colors.pitch.greenFaint,
  },
  langFlag: {
    fontSize: 22,
  },
  langLabel: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 15,
  },
  langLabelActive: {
    color: colors.pitch.green,
    fontWeight: '600',
  },

  // Logout
  logoutButton: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.alert.redFaint,
    borderWidth: 1,
    borderColor: colors.alert.redMuted,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: colors.alert.red,
    fontWeight: '600',
  },

  // Login prompt (unauthenticated)
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  loginIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  loginText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  primaryButton: {
    backgroundColor: colors.pitch.green,
    paddingHorizontal: spacing['4xl'],
    paddingVertical: 14,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  secondaryButton: {
    paddingHorizontal: spacing['4xl'],
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.pitch.green,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['4xl'],
  },
});
