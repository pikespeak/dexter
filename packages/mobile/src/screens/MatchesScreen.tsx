import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { usePredictionsStore } from '../stores/predictions';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius, shadows } from '../theme';

/**
 * Matches Screen — Upcoming fixtures, Stadium Night aesthetic.
 * Scoreboard-style match cards with league overlines.
 */
export function MatchesScreen() {
  const { upcomingMatches, isLoading, fetchUpcomingMatches } = usePredictionsStore();
  const { t } = useI18n();

  useEffect(() => {
    fetchUpcomingMatches();
  }, []);

  const renderMatch = ({ item }: { item: any }) => {
    const kickoff = new Date(item.kickoff);
    const isToday = kickoff.toDateString() === new Date().toDateString();

    return (
      <TouchableOpacity style={styles.matchCard} activeOpacity={0.7}>
        <View style={styles.matchHeader}>
          <Text style={styles.leagueText}>{item.league}</Text>
          <Text style={styles.dateText}>
            {isToday
              ? t('matches.today')
              : kickoff.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
          </Text>
        </View>
        <View style={styles.matchBody}>
          <Text style={styles.teamText} numberOfLines={1}>
            {item.homeTeam}
          </Text>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>
              {kickoff.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={[styles.teamText, styles.awayText]} numberOfLines={1}>
            {item.awayTeam}
          </Text>
        </View>
        {item.venue && <Text style={styles.venueText}>{item.venue}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('matches.title')}</Text>
      </View>
      <FlatList
        data={upcomingMatches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={fetchUpcomingMatches}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: spacing.lg }}>⚽</Text>
            <Text style={styles.emptyText}>{t('matches.noMatches')}</Text>
          </View>
        }
      />
    </View>
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
  list: {
    padding: spacing.lg,
  },
  matchCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.card,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  leagueText: {
    ...typography.overline,
  },
  dateText: {
    ...typography.caption,
  },
  matchBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamText: {
    ...typography.h3,
    flex: 1,
  },
  awayText: {
    textAlign: 'right',
  },
  timeBadge: {
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginHorizontal: spacing.sm,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  venueText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
  },
  emptyText: {
    ...typography.body,
  },
});
