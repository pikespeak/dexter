import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  FlatList,
  Platform,
  Share,
} from 'react-native';
import { useI18n, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '../i18n';
import { useAuthStore } from '../stores/auth';
import { colors, typography, spacing, radius, shadows } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const LOCALES: Locale[] = ['en', 'de', 'fr', 'es', 'it'];

const LEAGUES = [
  { id: 'epl', key: 'league.epl', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#3D195B' },
  { id: 'laliga', key: 'league.laliga', flag: '🇪🇸', color: '#EE8707' },
  { id: 'bundesliga', key: 'league.bundesliga', flag: '🇩🇪', color: '#D20515' },
  { id: 'seriea', key: 'league.seriea', flag: '🇮🇹', color: '#024494' },
  { id: 'ligue1', key: 'league.ligue1', flag: '🇫🇷', color: '#091C3E' },
];

// Mock gotcha prediction — showcases what Pro looks like
const GOTCHA_PREDICTION = {
  homeTeam: 'Arsenal',
  awayTeam: 'Man City',
  league: 'Premier League',
  kickoff: '20:45',
  homeWinProb: 38,
  drawProb: 27,
  awayWinProb: 35,
  confidence: 74,
  predictedScore: '2 – 1',
  isValueBet: true,
};

interface OnboardingProps {
  onComplete: () => void;
}

/**
 * Enhanced Onboarding — Conversion-optimized, sunk-cost principle.
 *
 * Flow: Language → Welcome → League Selection → Features → Gotcha Prediction → Review → Go
 *
 * Each step builds investment so users are more likely to convert.
 */
export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const { t, locale, setLocale } = useI18n();
  const { setFavoriteLeague } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // Page definitions — order matters for conversion funnel
  const PAGE_KEYS = ['lang', 'welcome', 'league', 'step1', 'step2', 'gotcha', 'review'] as const;
  const totalPages = PAGE_KEYS.length;

  const goNext = () => {
    if (currentIndex < totalPages - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Save league before completing
      if (selectedLeague) {
        setFavoriteLeague(selectedLeague);
      }
      onComplete();
    }
  };

  const handleSkip = () => {
    if (selectedLeague) {
      setFavoriteLeague(selectedLeague);
    }
    onComplete();
  };

  const handleReviewRequest = () => {
    // On native, this would use expo-store-review's requestReview()
    // For now we just advance to next step
    goNext();
  };

  const handleLeagueSelect = (leagueId: string) => {
    setSelectedLeague(leagueId);
  };

  const renderPage = ({ item, index }: { item: typeof PAGE_KEYS[number]; index: number }) => {
    switch (item) {
      case 'lang':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.langContent}>
              <Text style={pageStyles.langTitle}>{t('onboarding.selectLanguage')}</Text>
              <View style={pageStyles.langGrid}>
                {LOCALES.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      pageStyles.langOption,
                      locale === loc && pageStyles.langOptionActive,
                    ]}
                    onPress={() => setLocale(loc)}
                  >
                    <Text style={pageStyles.langFlag}>{LOCALE_FLAGS[loc]}</Text>
                    <Text
                      style={[
                        pageStyles.langLabel,
                        locale === loc && pageStyles.langLabelActive,
                      ]}
                    >
                      {LOCALE_LABELS[loc]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 'welcome':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.stepContent}>
              <View style={pageStyles.iconGlow}>
                <Text style={pageStyles.icon}>⚽</Text>
              </View>
              <Text style={pageStyles.stepTitle}>{t('onboarding.welcome')}</Text>
              <Text style={pageStyles.stepSubtitle}>{t('onboarding.welcomeSub')}</Text>
            </View>
          </View>
        );

      case 'league':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.leagueContent}>
              <Text style={pageStyles.leagueTitle}>{t('onboarding.pickLeague')}</Text>
              <Text style={pageStyles.leagueSub}>{t('onboarding.pickLeagueSub')}</Text>
              <View style={pageStyles.leagueGrid}>
                {LEAGUES.map((league) => {
                  const isSelected = selectedLeague === league.id;
                  return (
                    <TouchableOpacity
                      key={league.id}
                      style={[
                        pageStyles.leagueOption,
                        isSelected && pageStyles.leagueOptionActive,
                      ]}
                      onPress={() => handleLeagueSelect(league.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={pageStyles.leagueFlag}>{league.flag}</Text>
                      <Text style={[
                        pageStyles.leagueName,
                        isSelected && pageStyles.leagueNameActive,
                      ]}>
                        {t(league.key)}
                      </Text>
                      {isSelected && (
                        <View style={pageStyles.leagueCheck}>
                          <Text style={pageStyles.leagueCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case 'step1':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.stepContent}>
              <View style={pageStyles.iconGlow}>
                <Text style={pageStyles.icon}>🧠</Text>
              </View>
              <Text style={pageStyles.stepTitle}>{t('onboarding.step1Title')}</Text>
              <Text style={pageStyles.stepSubtitle}>{t('onboarding.step1Sub')}</Text>
            </View>
          </View>
        );

      case 'step2':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.stepContent}>
              <View style={pageStyles.iconGlow}>
                <Text style={pageStyles.icon}>💰</Text>
              </View>
              <Text style={pageStyles.stepTitle}>{t('onboarding.step2Title')}</Text>
              <Text style={pageStyles.stepSubtitle}>{t('onboarding.step2Sub')}</Text>
            </View>
          </View>
        );

      case 'gotcha':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.gotchaContent}>
              <Text style={pageStyles.gotchaTitle}>{t('onboarding.gotchaTitle')}</Text>
              <Text style={pageStyles.gotchaSub}>{t('onboarding.gotchaSub')}</Text>

              {/* Mini prediction card — the gotcha moment */}
              <View style={pageStyles.gotchaCard}>
                {/* Value bet badge */}
                <View style={pageStyles.gotchaValueBadge}>
                  <Text style={pageStyles.gotchaValueText}>{t('card.valueBet')}</Text>
                </View>

                {/* League + confidence */}
                <View style={pageStyles.gotchaHeader}>
                  <Text style={pageStyles.gotchaLeague}>{GOTCHA_PREDICTION.league}</Text>
                  <View style={pageStyles.gotchaConfBadge}>
                    <Text style={pageStyles.gotchaConfText}>{GOTCHA_PREDICTION.confidence}%</Text>
                  </View>
                </View>

                {/* Teams */}
                <View style={pageStyles.gotchaTeams}>
                  <View style={pageStyles.gotchaTeamCol}>
                    <Text style={pageStyles.gotchaTeamName}>{GOTCHA_PREDICTION.homeTeam}</Text>
                    <Text style={pageStyles.gotchaProb}>{GOTCHA_PREDICTION.homeWinProb}%</Text>
                  </View>
                  <View style={pageStyles.gotchaCenter}>
                    <Text style={pageStyles.gotchaScore}>{GOTCHA_PREDICTION.predictedScore}</Text>
                    <Text style={pageStyles.gotchaKickoff}>{GOTCHA_PREDICTION.kickoff}</Text>
                  </View>
                  <View style={[pageStyles.gotchaTeamCol, { alignItems: 'flex-end' }]}>
                    <Text style={pageStyles.gotchaTeamName}>{GOTCHA_PREDICTION.awayTeam}</Text>
                    <Text style={pageStyles.gotchaProb}>{GOTCHA_PREDICTION.awayWinProb}%</Text>
                  </View>
                </View>

                {/* Probability bar */}
                <View style={pageStyles.gotchaProbBar}>
                  <View style={[pageStyles.gotchaProbSeg, { flex: GOTCHA_PREDICTION.homeWinProb, backgroundColor: colors.pitch.green }]} />
                  <View style={[pageStyles.gotchaProbSeg, { flex: GOTCHA_PREDICTION.drawProb, backgroundColor: colors.text.muted }]} />
                  <View style={[pageStyles.gotchaProbSeg, { flex: GOTCHA_PREDICTION.awayWinProb, backgroundColor: colors.data.cyan }]} />
                </View>
              </View>

              {/* Pro tip — conversion nudge */}
              <View style={pageStyles.proTipBadge}>
                <Text style={pageStyles.proTipText}>
                  ⚡ {t('onboarding.gotchaProTip', { count: '12' })}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'review':
        return (
          <View style={[pageStyles.page, { width: SCREEN_W }]}>
            <View style={pageStyles.reviewContent}>
              {/* Star display */}
              <View style={pageStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={pageStyles.starIcon}>⭐</Text>
                ))}
              </View>
              <Text style={pageStyles.reviewTitle}>{t('onboarding.reviewTitle')}</Text>
              <Text style={pageStyles.reviewSub}>{t('onboarding.reviewSub')}</Text>

              <TouchableOpacity
                style={pageStyles.reviewCta}
                onPress={handleReviewRequest}
                activeOpacity={0.8}
              >
                <Text style={pageStyles.reviewCtaText}>{t('onboarding.reviewCta')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={pageStyles.reviewSkipBtn}
                onPress={goNext}
              >
                <Text style={pageStyles.reviewSkipText}>{t('onboarding.reviewSkip')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const isReviewPage = PAGE_KEYS[currentIndex] === 'review';
  const isLastPage = currentIndex === totalPages - 1;

  return (
    <View style={pageStyles.container}>
      {/* Skip button — hidden on review/last page */}
      {!isReviewPage && !isLastPage && currentIndex > 0 && (
        <TouchableOpacity style={pageStyles.skipButton} onPress={handleSkip}>
          <Text style={pageStyles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={PAGE_KEYS as unknown as typeof PAGE_KEYS[number][]}
        renderItem={renderPage}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
      />

      {/* Bottom: dots + CTA — hidden on review page (has its own buttons) */}
      {!isReviewPage && (
        <View style={pageStyles.bottom}>
          {/* Page dots */}
          <View style={pageStyles.dotsRow}>
            {Array.from({ length: totalPages }).map((_, i) => {
              const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [6, 24, 6],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    pageStyles.dot,
                    { width: dotWidth, opacity: dotOpacity },
                  ]}
                />
              );
            })}
          </View>

          <TouchableOpacity style={pageStyles.ctaButton} onPress={goNext} activeOpacity={0.8}>
            <Text style={pageStyles.ctaText}>
              {isLastPage ? t('onboarding.getStarted') : t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const pageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: spacing.xl,
    zIndex: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.text.muted,
    fontWeight: '600',
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // — Step content (welcome, features) —
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  iconGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.pitch.greenFaint,
    borderWidth: 1,
    borderColor: colors.pitch.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  icon: {
    fontSize: 56,
  },
  stepTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stepSubtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },

  // — Language page —
  langContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    width: '100%',
  },
  langTitle: {
    ...typography.h2,
    marginBottom: spacing['3xl'],
    textAlign: 'center',
  },
  langGrid: {
    width: '100%',
    gap: spacing.md,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    gap: spacing.lg,
  },
  langOptionActive: {
    borderColor: colors.pitch.green,
    backgroundColor: colors.pitch.greenFaint,
  },
  langFlag: {
    fontSize: 28,
  },
  langLabel: {
    ...typography.h3,
    color: colors.text.secondary,
  },
  langLabelActive: {
    color: colors.pitch.green,
  },

  // — League selection page —
  leagueContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    width: '100%',
  },
  leagueTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  leagueSub: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  leagueGrid: {
    width: '100%',
    gap: spacing.md,
  },
  leagueOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    gap: spacing.lg,
  },
  leagueOptionActive: {
    borderColor: colors.pitch.green,
    backgroundColor: colors.pitch.greenFaint,
  },
  leagueFlag: {
    fontSize: 24,
  },
  leagueName: {
    ...typography.h3,
    color: colors.text.secondary,
    flex: 1,
  },
  leagueNameActive: {
    color: colors.pitch.green,
  },
  leagueCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.pitch.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueCheckText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '800',
  },

  // — Gotcha prediction page —
  gotchaContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  gotchaTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  gotchaSub: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  gotchaCard: {
    width: '100%',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gold.muted,
    ...shadows.goldGlow,
  },
  gotchaValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold.faint,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  gotchaValueText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.gold.primary,
  },
  gotchaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gotchaLeague: {
    ...typography.overline,
  },
  gotchaConfBadge: {
    borderWidth: 1.5,
    borderColor: colors.pitch.greenMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  gotchaConfText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.pitch.green,
  },
  gotchaTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gotchaTeamCol: {
    flex: 1,
  },
  gotchaTeamName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  gotchaProb: {
    ...typography.prob,
    fontSize: 22,
  },
  gotchaCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  gotchaScore: {
    ...typography.score,
    fontSize: 22,
    color: colors.text.primary,
  },
  gotchaKickoff: {
    ...typography.caption,
    marginTop: 2,
  },
  gotchaProbBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    gap: 2,
  },
  gotchaProbSeg: {
    height: 4,
    borderRadius: 2,
  },

  // Pro tip below card
  proTipBadge: {
    marginTop: spacing.xl,
    backgroundColor: colors.pitch.greenFaint,
    borderWidth: 1,
    borderColor: colors.border.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  proTipText: {
    ...typography.bodySmall,
    color: colors.pitch.green,
    textAlign: 'center',
    fontWeight: '600',
  },

  // — Review prompt page —
  reviewContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  starIcon: {
    fontSize: 36,
  },
  reviewTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  reviewSub: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  reviewCta: {
    backgroundColor: colors.pitch.green,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['4xl'],
    marginBottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
    ...shadows.glow,
  },
  reviewCtaText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 17,
  },
  reviewSkipBtn: {
    paddingVertical: spacing.md,
  },
  reviewSkipText: {
    ...typography.body,
    color: colors.text.muted,
    fontWeight: '600',
  },

  // — Bottom navigation —
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['5xl'],
    gap: spacing['2xl'],
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pitch.green,
  },
  ctaButton: {
    backgroundColor: colors.pitch.green,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 17,
  },
});
