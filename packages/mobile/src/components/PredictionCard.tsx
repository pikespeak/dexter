import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Surface, Chip } from 'react-native-paper';
import { md3, colors, typography, spacing, shape } from '../theme';
import { useI18n } from '../i18n';

interface PredictionCardProps {
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
    prediction: {
      homeWinProb: number;
      drawProb: number;
      awayWinProb: number;
      overUnder25?: string;
      btts?: boolean;
      predictedScore?: string;
      confidence: number;
    };
    isValueBet?: boolean;
  };
  onPress?: () => void;
}

/**
 * Prediction Card — M3 Filled Card variant using Paper Surface.
 */
export function PredictionCard({ prediction, onPress }: PredictionCardProps) {
  const { t } = useI18n();
  const { match, prediction: pred } = prediction;

  const kickoffTime = new Date(match.kickoff).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isLive = new Date(match.kickoff) <= new Date();
  const confidenceColor =
    pred.confidence >= 70
      ? md3.primary
      : pred.confidence >= 50
        ? md3.tertiary
        : md3.error;

  // Determine predicted outcome
  const maxProb = Math.max(pred.homeWinProb, pred.drawProb, pred.awayWinProb);
  const predictedOutcome =
    maxProb === pred.homeWinProb
      ? t('card.homeWin')
      : maxProb === pred.awayWinProb
        ? t('card.awayWin')
        : t('card.draw');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.touchable}
    >
      <Surface
        style={[styles.card, prediction.isValueBet && styles.valueBetCard]}
        elevation={2}
      >
        {/* Header: League + Confidence + Live/Value badges */}
        <View style={styles.header}>
          <Text style={styles.league}>{match.league}</Text>
          <View style={styles.badges}>
            {prediction.isValueBet && (
              <Chip
                mode="flat"
                compact
                style={styles.valueBetChip}
                textStyle={styles.valueBetText}
              >
                {t('card.valueBet')}
              </Chip>
            )}
            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t('home.liveTag')}</Text>
              </View>
            )}
            <Chip
              mode="flat"
              compact
              style={[styles.confidenceChip, { backgroundColor: confidenceColor + '18' }]}
              textStyle={[styles.confidenceValue, { color: confidenceColor }]}
            >
              {pred.confidence}%
            </Chip>
          </View>
        </View>

        {/* Teams + Probabilities */}
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.homeTeam}
            </Text>
            <Text style={styles.probNumber}>{pred.homeWinProb}%</Text>
          </View>

          <View style={styles.centerCol}>
            <Text style={styles.kickoffLabel}>{t('card.kickoff')}</Text>
            <Text style={styles.kickoffTime}>{kickoffTime}</Text>
            {pred.predictedScore && (
              <Text style={styles.predictedScore}>{pred.predictedScore}</Text>
            )}
          </View>

          <View style={[styles.teamCol, styles.awayCol]}>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.awayTeam}
            </Text>
            <Text style={styles.probNumber}>{pred.awayWinProb}%</Text>
          </View>
        </View>

        {/* Probability bar */}
        <View style={styles.probBarContainer}>
          <View style={[styles.probBarSegment, styles.homeSegment, { flex: pred.homeWinProb }]} />
          <View style={[styles.probBarSegment, styles.drawSegment, { flex: pred.drawProb }]} />
          <View style={[styles.probBarSegment, styles.awaySegment, { flex: pred.awayWinProb }]} />
        </View>

        {/* Draw row */}
        <View style={styles.drawRow}>
          <Text style={styles.drawLabel}>{t('card.draw')}</Text>
          <Text style={styles.drawProb}>{pred.drawProb}%</Text>
        </View>

        {/* Tags — M3 Chips */}
        <View style={styles.tagsRow}>
          <Chip mode="flat" compact style={styles.chipTonal} textStyle={styles.chipTextTonal}>
            {predictedOutcome}
          </Chip>
          {pred.overUnder25 && (
            <Chip mode="flat" compact style={styles.chip} textStyle={styles.chipText}>
              {pred.overUnder25 === 'over' ? t('card.over25') : t('card.under25')}
            </Chip>
          )}
          {pred.btts !== undefined && (
            <Chip mode="flat" compact style={styles.chip} textStyle={styles.chipText}>
              {pred.btts ? t('card.bttsYes') : t('card.bttsNo')}
            </Chip>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: shape.large,
    padding: spacing.lg,
  },
  valueBetCard: {
    backgroundColor: md3.tertiaryContainer + '30',
    borderWidth: 1,
    borderColor: md3.tertiary + '40',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  league: {
    ...typography.overline,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  valueBetChip: {
    backgroundColor: md3.tertiaryContainer,
    height: 24,
  },
  valueBetText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: md3.onTertiaryContainer,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: md3.errorContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: shape.small,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: md3.onErrorContainer,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: md3.onErrorContainer,
  },
  confidenceChip: {
    height: 24,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  // Teams
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  teamCol: {
    flex: 1,
  },
  awayCol: {
    alignItems: 'flex-end',
  },
  teamName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  probNumber: {
    ...typography.prob,
  },
  centerCol: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  kickoffLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  kickoffTime: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: md3.onSurfaceVariant,
  },
  predictedScore: {
    ...typography.score,
    fontSize: 22,
    marginTop: spacing.xs,
    color: md3.onSurface,
  },
  // Probability bar
  probBarContainer: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
    gap: 2,
  },
  probBarSegment: {
    height: 4,
    borderRadius: 2,
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
  // Draw row
  drawRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  drawLabel: {
    ...typography.bodySmall,
    color: md3.outline,
  },
  drawProb: {
    ...typography.bodySmall,
    color: md3.outline,
    fontWeight: '500',
  },
  // M3 Chips
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: md3.surfaceContainerHighest,
    height: 28,
  },
  chipTonal: {
    backgroundColor: md3.primaryContainer + '50',
    height: 28,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: md3.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  chipTextTonal: {
    fontSize: 12,
    fontWeight: '500',
    color: md3.onPrimaryContainer,
    letterSpacing: 0.1,
  },
});
