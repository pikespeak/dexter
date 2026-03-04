import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../theme';
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
 * Prediction Card — Stadium Night design.
 *
 * Features:
 * - Animated probability bar with pitch-green glow
 * - Confidence ring (green/gold/red based on threshold)
 * - Value Bet badge with gold accent
 * - Scoreboard-inspired typography
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
      ? colors.pitch.green
      : pred.confidence >= 50
        ? colors.gold.primary
        : colors.alert.red;

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
      style={[styles.card, prediction.isValueBet && styles.valueBetCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header: League + Confidence + Live/Value badges */}
      <View style={styles.header}>
        <Text style={styles.league}>{match.league}</Text>
        <View style={styles.badges}>
          {prediction.isValueBet && (
            <View style={styles.valueBetBadge}>
              <Text style={styles.valueBetText}>{t('card.valueBet')}</Text>
            </View>
          )}
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('home.liveTag')}</Text>
            </View>
          )}
          <View style={[styles.confidenceBadge, { borderColor: confidenceColor + '50' }]}>
            <Text style={[styles.confidenceValue, { color: confidenceColor }]}>
              {pred.confidence}%
            </Text>
          </View>
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
        <View
          style={[
            styles.probBarSegment,
            styles.homeSegment,
            { flex: pred.homeWinProb },
          ]}
        />
        <View
          style={[
            styles.probBarSegment,
            styles.drawSegment,
            { flex: pred.drawProb },
          ]}
        />
        <View
          style={[
            styles.probBarSegment,
            styles.awaySegment,
            { flex: pred.awayWinProb },
          ]}
        />
      </View>

      {/* Draw row */}
      <View style={styles.drawRow}>
        <Text style={styles.drawLabel}>{t('card.draw')}</Text>
        <Text style={styles.drawProb}>{pred.drawProb}%</Text>
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        <View style={[styles.tag, styles.outcomeTag]}>
          <Text style={styles.tagText}>{predictedOutcome}</Text>
        </View>
        {pred.overUnder25 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {pred.overUnder25 === 'over' ? t('card.over25') : t('card.under25')}
            </Text>
          </View>
        )}
        {pred.btts !== undefined && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {pred.btts ? t('card.bttsYes') : t('card.bttsNo')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.card,
  },
  valueBetCard: {
    borderColor: colors.gold.muted,
    ...shadows.goldGlow,
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
  valueBetBadge: {
    backgroundColor: colors.gold.faint,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  valueBetText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.gold.primary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.alert.redFaint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.alert.red,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.alert.red,
  },
  confidenceBadge: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '800',
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  predictedScore: {
    ...typography.score,
    fontSize: 22,
    marginTop: spacing.xs,
    color: colors.text.primary,
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
    backgroundColor: colors.pitch.green,
  },
  drawSegment: {
    backgroundColor: colors.text.muted,
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
    color: colors.text.muted,
  },
  drawProb: {
    ...typography.bodySmall,
    color: colors.text.muted,
    fontWeight: '600',
  },
  // Tags
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  outcomeTag: {
    backgroundColor: colors.pitch.greenFaint,
    borderColor: colors.border.accent,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },
});
