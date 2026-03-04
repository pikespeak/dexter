import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PredictionCardProps {
  prediction: {
    id: string;
    match: {
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
  };
  onPress?: () => void;
}

/**
 * Prediction Card Component
 * Displays a match prediction with probabilities and confidence badge.
 */
export function PredictionCard({ prediction, onPress }: PredictionCardProps) {
  const { match, prediction: pred } = prediction;
  const kickoffTime = new Date(match.kickoff).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const confidenceColor = pred.confidence >= 70 ? '#22c55e' : pred.confidence >= 50 ? '#f59e0b' : '#ef4444';

  // Determine the predicted outcome
  const maxProb = Math.max(pred.homeWinProb, pred.drawProb, pred.awayWinProb);
  const predictedOutcome =
    maxProb === pred.homeWinProb ? 'Heim' :
    maxProb === pred.awayWinProb ? 'Auswärts' : 'Unentschieden';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.league}>{match.league}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {pred.confidence}%
          </Text>
        </View>
      </View>

      {/* Teams */}
      <View style={styles.teamsRow}>
        <View style={styles.teamContainer}>
          <Text style={styles.teamName}>{match.homeTeam}</Text>
          <Text style={styles.probability}>{pred.homeWinProb}%</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.kickoffTime}>{kickoffTime}</Text>
          {pred.predictedScore && (
            <Text style={styles.predictedScore}>{pred.predictedScore}</Text>
          )}
        </View>

        <View style={[styles.teamContainer, styles.awayTeam]}>
          <Text style={styles.teamName}>{match.awayTeam}</Text>
          <Text style={styles.probability}>{pred.awayWinProb}%</Text>
        </View>
      </View>

      {/* Draw probability bar */}
      <View style={styles.drawRow}>
        <Text style={styles.drawLabel}>Unentschieden</Text>
        <Text style={styles.drawProb}>{pred.drawProb}%</Text>
      </View>

      {/* Bottom row - additional predictions */}
      <View style={styles.bottomRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {predictedOutcome}
          </Text>
        </View>
        {pred.overUnder25 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {pred.overUnder25 === 'over' ? 'Über 2.5' : 'Unter 2.5'}
            </Text>
          </View>
        )}
        {pred.btts !== undefined && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              BTTS: {pred.btts ? 'Ja' : 'Nein'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  league: {
    fontSize: 12,
    color: '#6666aa',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamContainer: {
    flex: 1,
  },
  awayTeam: {
    alignItems: 'flex-end',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  probability: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4444ff',
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  kickoffTime: {
    fontSize: 12,
    color: '#6666aa',
    marginBottom: 4,
  },
  predictedScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  drawRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    marginBottom: 8,
  },
  drawLabel: {
    fontSize: 13,
    color: '#8888aa',
  },
  drawProb: {
    fontSize: 13,
    color: '#8888aa',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2a2a4e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#aaaacc',
    fontWeight: '500',
  },
});
