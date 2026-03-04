import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import {
  Avatar,
  Button,
  Chip,
  Divider,
  List,
  ProgressBar,
  RadioButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth';
import { useReferralStore } from '../stores/referral';
import { useI18n, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '../i18n';
import { md3, typography, spacing, shape, elevation } from '../theme';
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
    free: md3.outline,
    pro: md3.primary,
    premium: md3.tertiary,
  };

  const progressPercent = Math.min((invitedCount / goal) * 100, 100);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Avatar.Icon size={88} icon="account" style={styles.loginIcon} />
          <Text style={styles.loginText}>{t('profile.loginPrompt')}</Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={styles.fullWidthButton}
          >
            {t('profile.login')}
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.fullWidthButton}
          >
            {t('profile.register')}
          </Button>
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
          <Avatar.Text
            size={56}
            label={(user?.displayName || user?.email || '?')[0].toUpperCase()}
            style={styles.avatar}
          />
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
            <View style={[styles.referralReward, isCompleted && styles.referralRewardCompleted]}>
              <Text style={styles.referralRewardIcon}>{isCompleted ? '🏆' : '🎁'}</Text>
            </View>
          </View>

          <ProgressBar
            progress={progressPercent / 100}
            color={md3.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            {t('referral.progress', { current: String(invitedCount), total: String(goal) })}
          </Text>

          {!isCompleted && (
            <Button mode="contained" onPress={handleShare} style={styles.fullWidthButton}>
              {t('referral.shareCta')}
            </Button>
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
          <Chip
            mode="flat"
            style={[styles.planBadge, { backgroundColor: (planColor[plan] || md3.outline) + '18' }]}
            textStyle={[styles.planBadgeText, { color: planColor[plan] || md3.outline }]}
          >
            {planLabel[plan] || 'Free'}
          </Chip>
          {plan === 'free' && (
            <Button
              mode="contained-tonal"
              onPress={() => navigation.navigate('Paywall')}
              compact
            >
              {t('profile.upgradePro')}
            </Button>
          )}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>

        <List.Item
          title={t('profile.pushNotifications')}
          titleStyle={styles.listItemTitle}
          right={() => <Text style={styles.settingsValue}>{t('common.on')}</Text>}
        />
        <Divider style={styles.divider} />

        <List.Item
          title={t('profile.language')}
          titleStyle={styles.listItemTitle}
          right={() => (
            <Text style={styles.settingsValue}>
              {LOCALE_FLAGS[locale]} {LOCALE_LABELS[locale]}
            </Text>
          )}
          onPress={() => setShowLangPicker(!showLangPicker)}
        />
        <Divider style={styles.divider} />

        {showLangPicker && (
          <View style={styles.langPicker}>
            {LOCALES.map((loc) => (
              <List.Item
                key={loc}
                title={`${LOCALE_FLAGS[loc]}  ${LOCALE_LABELS[loc]}`}
                titleStyle={[styles.langLabel, locale === loc && styles.langLabelActive]}
                style={[styles.langOption, locale === loc && styles.langOptionActive]}
                onPress={() => {
                  setLocale(loc);
                  setShowLangPicker(false);
                }}
                right={() => (
                  <RadioButton
                    value={loc}
                    status={locale === loc ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setLocale(loc);
                      setShowLangPicker(false);
                    }}
                    color={md3.primary}
                  />
                )}
              />
            ))}
          </View>
        )}

        <List.Item
          title={t('profile.privacy')}
          titleStyle={styles.listItemTitle}
          right={() => <List.Icon icon="chevron-right" color={md3.outline} />}
        />
        <Divider style={styles.divider} />

        <List.Item
          title={t('profile.terms')}
          titleStyle={styles.listItemTitle}
          right={() => <List.Icon icon="chevron-right" color={md3.outline} />}
        />
      </View>

      {/* Logout */}
      <Button
        mode="contained"
        onPress={handleLogout}
        buttonColor={md3.errorContainer}
        textColor={md3.onErrorContainer}
        style={styles.logoutButton}
      >
        {t('profile.logout')}
      </Button>

      <Text style={styles.version}>{t('profile.version', { version: '0.1.0' })}</Text>
    </ScrollView>
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
    backgroundColor: md3.primaryContainer,
  },
  userName: {
    ...typography.h3,
  },
  userEmail: {
    ...typography.bodySmall,
    color: md3.outline,
  },

  // Referral card
  referralCard: {
    backgroundColor: md3.surfaceContainerHigh,
    borderRadius: shape.large,
    padding: spacing.xl,
    ...elevation.level1,
  },
  referralCardCompleted: {
    backgroundColor: md3.tertiaryContainer + '30',
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
    color: md3.onSurfaceVariant,
    maxWidth: 220,
  },
  referralReward: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: md3.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralRewardCompleted: {
    backgroundColor: md3.tertiaryContainer,
  },
  referralRewardIcon: {
    fontSize: 22,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: md3.surfaceContainerHighest,
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  rewardBadge: {
    backgroundColor: md3.tertiaryContainer,
    borderRadius: shape.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rewardBadgeText: {
    ...typography.button,
    color: md3.onTertiaryContainer,
  },

  // Plan card
  planCard: {
    backgroundColor: md3.surfaceContainerHigh,
    borderRadius: shape.large,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...elevation.level1,
  },
  planBadge: {
    height: 32,
  },
  planBadgeText: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.1,
  },

  // M3 Buttons
  fullWidthButton: {
    borderRadius: shape.full,
    width: '100%',
  },

  // Settings
  listItemTitle: {
    ...typography.body,
    color: md3.onSurface,
    fontSize: 16,
  },
  settingsValue: {
    ...typography.bodySmall,
    color: md3.outline,
    alignSelf: 'center',
  },
  divider: {
    backgroundColor: md3.outlineVariant + '60',
  },

  // Language picker
  langPicker: {
    backgroundColor: md3.surfaceContainerHigh,
    borderRadius: shape.medium,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  langOption: {
    borderBottomWidth: 1,
    borderBottomColor: md3.outlineVariant + '40',
  },
  langOptionActive: {
    backgroundColor: md3.secondaryContainer + '60',
  },
  langLabel: {
    ...typography.body,
    color: md3.onSurfaceVariant,
    fontSize: 15,
  },
  langLabelActive: {
    color: md3.onSecondaryContainer,
    fontWeight: '500',
  },

  // Logout
  logoutButton: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    borderRadius: shape.full,
  },

  // Login prompt (unauthenticated)
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
    gap: spacing.md,
  },
  loginIcon: {
    backgroundColor: md3.surfaceContainerHigh,
    marginBottom: spacing.lg,
  },
  loginText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['4xl'],
  },
});
