import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { predictionsApi } from '../services/api';
import { useI18n } from '../i18n';
import { md3, colors, typography, spacing, shape } from '../theme';
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
        <ActivityIndicator size="large" color={md3.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconCircle}>
          <Text style={styles.errorIcon}>!</Text>
        </View>
        <Text style={styles.errorTitle}>{t('error.title')}</Text>
        <Text style={styles.errorMessage}>{error || t('error.generic')}</Text>
        <Button mode="contained" onPress={loadDetail} style={styles.retryButton}>
          {t('error.retry')}
        </Button>
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
    confidence >= 70 ? md3.primary : confidence >= 50 ? md3.tertiary : md3.error;

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
      <IconButton
        icon="arrow-left"
        iconColor={md3.primary}
        size={24}
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      />

      {/* Match header */}
      <View style={styles.matchHeader}>
        <Text style={styles.league}>{prediction.match.league}</Text>
        <Text style={styles.kickoff}>
          {kickoff.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
          {kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {prediction.match.venue && <Text style={styles.venue}>{prediction.match.venue}</Text>}
      </View>

      {/* Probabilities card — M3 Elevated Card */}
      <Card mode="elevated" style={styles.probCard}>
        <Card.Content>
          <View style={styles.teamProb}>
            <Text style={styles.teamName}>{prediction.match.homeTeam}</Text>
            <Text style={styles.probValue}>{homeProb}%</Text>
          </View>

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
        </Card.Content>
      </Card>

      {/* Meta badges — M3 Chips */}
      <View style={styles.metaRow}>
        <Chip
          mode="flat"
          compact
          style={[styles.metaChip, { backgroundColor: confidenceColor + '18' }]}
          textStyle={[styles.metaChipText, { color: confidenceColor }]}
        >
          {t('card.confidence')}: {confidence}%
        </Chip>
        {prediction.predictedScore && (
          <Chip mode="flat" compact style={styles.metaChip} textStyle={styles.metaChipText}>
            {prediction.predictedScore}
          </Chip>
        )}
        {prediction.overUnder25 && (
          <Chip mode="flat" compact style={styles.metaChip} textStyle={styles.metaChipText}>
            {prediction.overUnder25 === 'over' ? t('card.over25') : t('card.under25')}
          </Chip>
        )}
        {prediction.btts !== undefined && (
          <Chip mode="flat" compact style={styles.metaChip} textStyle={styles.metaChipText}>
            {prediction.btts ? t('card.bttsYes') : t('card.bttsNo')}
          </Chip>
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
            <Card key={i} mode="outlined" style={styles.valueBetCard}>
              <Card.Content>
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
              </Card.Content>
            </Card>
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
    backgroundColor: md3.surfaceContainerLowest,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['4xl'],
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: md3.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 28,
    color: md3.onErrorContainer,
    fontWeight: '600',
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
    borderRadius: shape.full,
  },
  backButton: {
    marginLeft: spacing.sm,
    marginTop: 48,
  },
  // Match header
  matchHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  league: {
    ...typography.overline,
    color: md3.primary,
    marginBottom: spacing.sm,
  },
  kickoff: {
    ...typography.body,
    color: md3.onSurface,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  venue: {
    ...typography.caption,
  },
  // Probability card
  probCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: shape.large,
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
    color: md3.outline,
  },
  drawValue: {
    ...typography.bodySmall,
    color: md3.outline,
    fontWeight: '500',
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
    backgroundColor: md3.primary,
  },
  drawSegment: {
    backgroundColor: md3.outline,
  },
  awaySegment: {
    backgroundColor: colors.data.cyan,
  },
  // Meta — M3 Chips
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  metaChip: {
    backgroundColor: md3.surfaceContainerHighest,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: md3.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  // Analysis
  analysisSection: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.overline,
    color: md3.primary,
    marginBottom: spacing.md,
  },
  analysisText: {
    ...typography.body,
    lineHeight: 20,
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
    backgroundColor: md3.primary,
    marginTop: 7,
  },
  factorText: {
    ...typography.body,
    flex: 1,
    lineHeight: 20,
  },
  // Value Bets
  valueBetCard: {
    marginBottom: spacing.sm,
    borderRadius: shape.medium,
    borderColor: md3.tertiary + '40',
    backgroundColor: md3.tertiaryContainer + '30',
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
    backgroundColor: md3.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: shape.small,
  },
  edgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: md3.onPrimaryContainer,
    letterSpacing: 0.1,
  },
  valueBetDetails: {
    gap: spacing.xs,
  },
  valueBetDetail: {
    ...typography.bodySmall,
    color: md3.outline,
  },
});
