import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { predictionsApi } from '../services/api';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius, shadows } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type DetailRoute = RouteProp<RootStackParamList, 'PredictionDetail'>;

interface DetailData {
  prediction: {
    id: string;
    match: {
      id: string;
      homeTeam: string;
      awayTeam: string;
      league: string;
      kickoff: string;
      venue?: string;
    };
    prediction: Record<string, unknown>;
    probabilities: {
      homeWin: number;
      draw: number;
      awayWin: number;
    };
    overUnder25?: string;
    btts?: boolean;
    predictedScore?: string;
    confidence: number;
    valueBets: Array<{
      betType: string;
      ourProbability: number;
      bestOdds: number;
      bookmaker: string;
      edge: number;
      kellyStake?: number;
    }>;
  };
}

export function PredictionDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { matchId } = route.params;

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDetail();
  }, [matchId]);

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await predictionsApi.getByMatch(matchId);
      setData(result as DetailData);
    } catch (err) {
      setError((err as Error).message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.pitch.green} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorTitle}>{t('error.title')}</Text>
        <Text style={styles.errorMessage}>{error || t('error.generic')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryText}>{t('error.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { prediction } = data;
  const kickoff = new Date(prediction.match.kickoff);
  const homeProb = Number(prediction.probabilities.homeWin);
  const drawProb = Number(prediction.probabilities.draw);
  const awayProb = Number(prediction.probabilities.awayWin);
  const confidence = Number(prediction.confidence);
  const confidenceColor =
    confidence >= 70 ? colors.pitch.green : confidence >= 50 ? colors.gold.primary : colors.alert.red;

  const analysis = prediction.prediction as {
    summary?: string;
    keyFactors?: string[];
    homeStrengths?: string[];
    awayStrengths?: string[];
    injuries?: string;
    formAnalysis?: string;
    headToHeadInsight?: string;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹ {t('auth.close')}</Text>
      </TouchableOpacity>

      {/* Match header */}
      <View style={styles.matchHeader}>
        <Text style={styles.league}>{prediction.match.league}</Text>
        <Text style={styles.kickoff}>
          {kickoff.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
          {kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {prediction.match.venue && <Text style={styles.venue}>{prediction.match.venue}</Text>}
      </View>

      {/* Probabilities card */}
      <View style={styles.probCard}>
        <View style={styles.teamProb}>
          <Text style={styles.teamName}>{prediction.match.homeTeam}</Text>
          <Text style={styles.probValue}>{homeProb}%</Text>
        </View>

        {/* Probability bar */}
        <View style={styles.probBar}>
          <View style={[styles.probSegment, styles.homeSegment, { flex: homeProb }]} />
          <View style={[styles.probSegment, styles.drawSegment, { flex: drawProb }]} />
          <View style={[styles.probSegment, styles.awaySegment, { flex: awayProb }]} />
        </View>

        <View style={styles.teamProb}>
          <Text style={styles.drawLabel}>{t('card.draw')}</Text>
          <Text style={styles.drawValue}>{drawProb}%</Text>
        </View>
        <View style={[styles.teamProb, { marginBottom: 0 }]}>
          <Text style={styles.teamName}>{prediction.match.awayTeam}</Text>
          <Text style={styles.probValue}>{awayProb}%</Text>
        </View>
      </View>

      {/* Meta badges */}
      <View style={styles.metaRow}>
        <View style={[styles.metaBadge, { borderColor: confidenceColor + '50' }]}>
          <Text style={[styles.metaBadgeText, { color: confidenceColor }]}>
            {t('card.confidence')}: {confidence}%
          </Text>
        </View>
        {prediction.predictedScore && (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>{prediction.predictedScore}</Text>
          </View>
        )}
        {prediction.overUnder25 && (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>
              {prediction.overUnder25 === 'over' ? t('card.over25') : t('card.under25')}
            </Text>
          </View>
        )}
        {prediction.btts !== undefined && (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>
              {prediction.btts ? t('card.bttsYes') : t('card.bttsNo')}
            </Text>
          </View>
        )}
      </View>

      {/* Analysis sections */}
      {analysis.summary && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Analysis</Text>
          <Text style={styles.analysisText}>{analysis.summary}</Text>
        </View>
      )}

      {analysis.keyFactors && analysis.keyFactors.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Key Factors</Text>
          {analysis.keyFactors.map((factor, i) => (
            <View key={i} style={styles.factorRow}>
              <View style={styles.factorDot} />
              <Text style={styles.factorText}>{factor}</Text>
            </View>
          ))}
        </View>
      )}

      {analysis.homeStrengths && analysis.homeStrengths.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>{prediction.match.homeTeam}</Text>
          {analysis.homeStrengths.map((s, i) => (
            <View key={i} style={styles.factorRow}>
              <View style={styles.factorDot} />
              <Text style={styles.factorText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {analysis.awayStrengths && analysis.awayStrengths.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>{prediction.match.awayTeam}</Text>
          {analysis.awayStrengths.map((s, i) => (
            <View key={i} style={styles.factorRow}>
              <View style={styles.factorDot} />
              <Text style={styles.factorText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {analysis.formAnalysis && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Form</Text>
          <Text style={styles.analysisText}>{analysis.formAnalysis}</Text>
        </View>
      )}

      {analysis.headToHeadInsight && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Head-to-Head</Text>
          <Text style={styles.analysisText}>{analysis.headToHeadInsight}</Text>
        </View>
      )}

      {analysis.injuries && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Injuries</Text>
          <Text style={styles.analysisText}>{analysis.injuries}</Text>
        </View>
      )}

      {/* Value Bets */}
      {prediction.valueBets.length > 0 && (
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>{t('card.valueBet')}S</Text>
          {prediction.valueBets.map((vb, i) => (
            <View key={i} style={styles.valueBetCard}>
              <View style={styles.valueBetHeader}>
                <Text style={styles.valueBetType}>{formatBetType(vb.betType)}</Text>
                <View style={styles.edgeBadge}>
                  <Text style={styles.edgeText}>+{vb.edge}%</Text>
                </View>
              </View>
              <View style={styles.valueBetDetails}>
                <Text style={styles.valueBetDetail}>
                  Odds: {vb.bestOdds} ({vb.bookmaker})
                </Text>
                <Text style={styles.valueBetDetail}>
                  Prob: {vb.ourProbability}%
                </Text>
                {vb.kellyStake !== undefined && (
                  <Text style={styles.valueBetDetail}>Kelly: {vb.kellyStake}%</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
}

function formatBetType(type: string): string {
  const map: Record<string, string> = {
    '1X2_Home': 'Home Win',
    '1X2_Draw': 'Draw',
    '1X2_Away': 'Away Win',
  };
  return map[type] || type;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['4xl'],
  },
  errorIcon: {
    fontSize: 48,
    color: colors.alert.red,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  retryButton: {
    backgroundColor: colors.pitch.green,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
  },
  backText: {
    color: colors.pitch.green,
    fontSize: 16,
    fontWeight: '600',
  },
  // Match header
  matchHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  league: {
    ...typography.overline,
    color: colors.pitch.green,
    marginBottom: spacing.sm,
  },
  kickoff: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  venue: {
    ...typography.caption,
  },
  // Probability card
  probCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.card,
  },
  teamProb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  teamName: {
    ...typography.h3,
    flex: 1,
  },
  probValue: {
    ...typography.prob,
  },
  drawLabel: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
  drawValue: {
    ...typography.bodySmall,
    color: colors.text.muted,
    fontWeight: '600',
  },
  probBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
    gap: 2,
  },
  probSegment: {
    height: 6,
    borderRadius: 3,
  },
  homeSegment: {
    backgroundColor: colors.pitch.green,
  },
  drawSegment: {
    backgroundColor: colors.text.muted,
  },
  awaySegment: {
    backgroundColor: colors.data.cyan,
  },
  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  metaBadge: {
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  metaBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  // Analysis
  analysisSection: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.pitch.green,
    marginBottom: spacing.md,
  },
  analysisText: {
    ...typography.body,
    lineHeight: 22,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  factorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pitch.green,
    marginTop: 8,
  },
  factorText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },
  // Value Bets
  valueBetCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold.muted,
  },
  valueBetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  valueBetType: {
    ...typography.h3,
  },
  edgeBadge: {
    backgroundColor: colors.pitch.greenFaint,
    borderWidth: 1,
    borderColor: colors.pitch.greenMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  edgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.pitch.green,
  },
  valueBetDetails: {
    gap: spacing.xs,
  },
  valueBetDetail: {
    ...typography.bodySmall,
    color: colors.text.muted,
  },
});
