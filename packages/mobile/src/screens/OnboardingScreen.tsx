import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useI18n, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '../i18n';
import { useAuthStore } from '../stores/auth';
import { md3, colors, typography, spacing, shape, elevation } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const LOCALES: Locale[] = ['en', 'de', 'fr', 'es', 'it'];

const LEAGUES = [
  { id: 'epl', key: 'league.epl', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#3D195B' },
  { id: 'laliga', key: 'league.laliga', flag: '🇪🇸', color: '#EE8707' },
  { id: 'bundesliga', key: 'league.bundesliga', flag: '🇩🇪', color: '#D20515' },
  { id: 'seriea', key: 'league.seriea', flag: '🇮🇹', color: '#024494' },
  { id: 'ligue1', key: 'league.ligue1', flag: '🇫🇷', color: '#091C3E' },
];

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

export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const { t, locale, setLocale } = useI18n();
  const { setFavoriteLeague } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  const PAGE_KEYS = ['lang', 'welcome', 'league', 'step1', 'step2', 'gotcha', 'review'] as const;
  const totalPages = PAGE_KEYS.length;

  const goNext = () => {
    if (currentIndex < totalPages - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
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
    goNext();
  };

  const handleLeagueSelect = (leagueId: string) => {
    setSelectedLeague(leagueId);
  };

  const renderPage = ({ item }: { item: typeof PAGE_KEYS[number] }) => {
    switch (item) {
      case 'lang':
        return (
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.langContent}>
              <Text style={s.langTitle}>{t('onboarding.selectLanguage')}</Text>
              <View style={s.langGrid}>
                {LOCALES.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[s.langOption, locale === loc && s.langOptionActive]}
                    onPress={() => setLocale(loc)}
                  >
                    <Text style={s.langFlag}>{LOCALE_FLAGS[loc]}</Text>
                    <Text style={[s.langLabel, locale === loc && s.langLabelActive]}>
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
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.stepContent}>
              <View style={s.iconCircle}>
                <Text style={s.icon}>⚽</Text>
              </View>
              <Text style={s.stepTitle}>{t('onboarding.welcome')}</Text>
              <Text style={s.stepSubtitle}>{t('onboarding.welcomeSub')}</Text>
            </View>
          </View>
        );

      case 'league':
        return (
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.leagueContent}>
              <Text style={s.leagueTitle}>{t('onboarding.pickLeague')}</Text>
              <Text style={s.leagueSub}>{t('onboarding.pickLeagueSub')}</Text>
              <View style={s.leagueGrid}>
                {LEAGUES.map((league) => {
                  const isSelected = selectedLeague === league.id;
                  return (
                    <TouchableOpacity
                      key={league.id}
                      style={[s.leagueOption, isSelected && s.leagueOptionActive]}
                      onPress={() => handleLeagueSelect(league.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.leagueFlag}>{league.flag}</Text>
                      <Text style={[s.leagueName, isSelected && s.leagueNameActive]}>
                        {t(league.key)}
                      </Text>
                      {isSelected && (
                        <View style={s.leagueCheck}>
                          <Text style={s.leagueCheckText}>✓</Text>
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
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.stepContent}>
              <View style={s.iconCircle}>
                <Text style={s.icon}>🧠</Text>
              </View>
              <Text style={s.stepTitle}>{t('onboarding.step1Title')}</Text>
              <Text style={s.stepSubtitle}>{t('onboarding.step1Sub')}</Text>
            </View>
          </View>
        );

      case 'step2':
        return (
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.stepContent}>
              <View style={s.iconCircle}>
                <Text style={s.icon}>💰</Text>
              </View>
              <Text style={s.stepTitle}>{t('onboarding.step2Title')}</Text>
              <Text style={s.stepSubtitle}>{t('onboarding.step2Sub')}</Text>
            </View>
          </View>
        );

      case 'gotcha':
        return (
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.gotchaContent}>
              <Text style={s.gotchaTitle}>{t('onboarding.gotchaTitle')}</Text>
              <Text style={s.gotchaSub}>{t('onboarding.gotchaSub')}</Text>

              <View style={s.gotchaCard}>
                <View style={s.gotchaValueBadge}>
                  <Text style={s.gotchaValueText}>{t('card.valueBet')}</Text>
                </View>

                <View style={s.gotchaHeader}>
                  <Text style={s.gotchaLeague}>{GOTCHA_PREDICTION.league}</Text>
                  <View style={s.gotchaConfBadge}>
                    <Text style={s.gotchaConfText}>{GOTCHA_PREDICTION.confidence}%</Text>
                  </View>
                </View>

                <View style={s.gotchaTeams}>
                  <View style={s.gotchaTeamCol}>
                    <Text style={s.gotchaTeamName}>{GOTCHA_PREDICTION.homeTeam}</Text>
                    <Text style={s.gotchaProb}>{GOTCHA_PREDICTION.homeWinProb}%</Text>
                  </View>
                  <View style={s.gotchaCenter}>
                    <Text style={s.gotchaScore}>{GOTCHA_PREDICTION.predictedScore}</Text>
                    <Text style={s.gotchaKickoff}>{GOTCHA_PREDICTION.kickoff}</Text>
                  </View>
                  <View style={[s.gotchaTeamCol, { alignItems: 'flex-end' }]}>
                    <Text style={s.gotchaTeamName}>{GOTCHA_PREDICTION.awayTeam}</Text>
                    <Text style={s.gotchaProb}>{GOTCHA_PREDICTION.awayWinProb}%</Text>
                  </View>
                </View>

                <View style={s.gotchaProbBar}>
                  <View style={[s.gotchaProbSeg, { flex: GOTCHA_PREDICTION.homeWinProb, backgroundColor: md3.primary }]} />
                  <View style={[s.gotchaProbSeg, { flex: GOTCHA_PREDICTION.drawProb, backgroundColor: md3.outline }]} />
                  <View style={[s.gotchaProbSeg, { flex: GOTCHA_PREDICTION.awayWinProb, backgroundColor: colors.data.cyan }]} />
                </View>
              </View>

              <View style={s.proTipBadge}>
                <Text style={s.proTipText}>
                  ⚡ {t('onboarding.gotchaProTip', { count: '12' })}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'review':
        return (
          <View style={[s.page, { width: SCREEN_W }]}>
            <View style={s.reviewContent}>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={s.starIcon}>⭐</Text>
                ))}
              </View>
              <Text style={s.reviewTitle}>{t('onboarding.reviewTitle')}</Text>
              <Text style={s.reviewSub}>{t('onboarding.reviewSub')}</Text>

              <Button
                mode="contained"
                onPress={handleReviewRequest}
                style={s.reviewCta}
                contentStyle={s.reviewCtaContent}
              >
                {t('onboarding.reviewCta')}
              </Button>

              <Button
                mode="text"
                onPress={goNext}
                textColor={md3.outline}
              >
                {t('onboarding.reviewSkip')}
              </Button>
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
    <View style={s.container}>
      {!isReviewPage && !isLastPage && currentIndex > 0 && (
        <Button
          mode="text"
          onPress={handleSkip}
          style={s.skipButton}
          textColor={md3.outline}
          compact
        >
          {t('onboarding.skip')}
        </Button>
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

      {!isReviewPage && (
        <View style={s.bottom}>
          <View style={s.dotsRow}>
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
                  style={[s.dot, { width: dotWidth, opacity: dotOpacity }]}
                />
              );
            })}
          </View>

          <Button
            mode="contained"
            onPress={goNext}
            style={s.ctaButton}
            contentStyle={s.ctaButtonContent}
          >
            {isLastPage ? t('onboarding.getStarted') : t('onboarding.next')}
          </Button>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
  },
  skipButton: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    zIndex: 10,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step content
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: md3.primaryContainer + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  icon: {
    fontSize: 52,
  },
  stepTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stepSubtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Language
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
    backgroundColor: md3.surfaceContainerHigh,
    borderRadius: shape.large,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.lg,
  },
  langOptionActive: {
    borderColor: md3.primary,
    backgroundColor: md3.primaryContainer + '25',
  },
  langFlag: {
    fontSize: 28,
  },
  langLabel: {
    ...typography.h3,
    color: md3.onSurfaceVariant,
  },
  langLabelActive: {
    color: md3.primary,
  },

  // League selection
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
    backgroundColor: md3.surfaceContainerHigh,
    borderRadius: shape.large,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.lg,
  },
  leagueOptionActive: {
    borderColor: md3.primary,
    backgroundColor: md3.primaryContainer + '25',
  },
  leagueFlag: {
    fontSize: 24,
  },
  leagueName: {
    ...typography.h3,
    color: md3.onSurfaceVariant,
    flex: 1,
  },
  leagueNameActive: {
    color: md3.primary,
  },
  leagueCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: md3.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueCheckText: {
    color: md3.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Gotcha prediction
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
    backgroundColor: md3.tertiaryContainer + '30',
    borderRadius: shape.large,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: md3.tertiary + '40',
  },
  gotchaValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: md3.tertiaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: shape.small,
    marginBottom: spacing.md,
  },
  gotchaValueText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: md3.onTertiaryContainer,
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
    backgroundColor: md3.primary + '18',
    borderRadius: shape.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  gotchaConfText: {
    fontSize: 12,
    fontWeight: '600',
    color: md3.primary,
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
    color: md3.onSurface,
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
  proTipBadge: {
    marginTop: spacing.xl,
    backgroundColor: md3.primaryContainer + '40',
    borderRadius: shape.medium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  proTipText: {
    ...typography.bodySmall,
    color: md3.onPrimaryContainer,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Review
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
    borderRadius: shape.full,
    width: '100%',
    marginBottom: spacing.lg,
  },
  reviewCtaContent: {
    paddingVertical: 4,
  },

  // Bottom
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
    backgroundColor: md3.primary,
  },
  ctaButton: {
    borderRadius: shape.full,
  },
  ctaButtonContent: {
    paddingVertical: 4,
  },
});
