import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { usePredictionsStore } from '../stores/predictions';

/**
 * Matches Screen - Upcoming fixtures list
 * Free for all users. Shows upcoming matches across leagues.
 */
export function MatchesScreen() {
  const { upcomingMatches, isLoading, fetchUpcomingMatches } = usePredictionsStore();

  useEffect(() => {
    fetchUpcomingMatches();
  }, []);

  const renderMatch = ({ item }: { item: any }) => {
    const kickoff = new Date(item.kickoff);
    const isToday = kickoff.toDateString() === new Date().toDateString();

    return (
      <TouchableOpacity style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <Text style={styles.leagueText}>{item.league}</Text>
          <Text style={styles.dateText}>
            {isToday ? 'Heute' : kickoff.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={styles.matchBody}>
          <Text style={styles.teamText}>{item.homeTeam}</Text>
          <Text style={styles.timeText}>
            {kickoff.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={[styles.teamText, styles.awayText]}>{item.awayTeam}</Text>
        </View>
        {item.venue && (
          <Text style={styles.venueText}>{item.venue}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spielplan</Text>
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
            <Text style={styles.emptyText}>Keine kommenden Spiele</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  list: { padding: 16 },
  matchCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leagueText: { fontSize: 12, color: '#6666aa', fontWeight: '600', textTransform: 'uppercase' },
  dateText: { fontSize: 12, color: '#6666aa' },
  matchBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamText: { fontSize: 16, fontWeight: '600', color: '#ffffff', flex: 1 },
  awayText: { textAlign: 'right' },
  timeText: { fontSize: 14, color: '#8888aa', paddingHorizontal: 12 },
  venueText: { fontSize: 11, color: '#555577', marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#8888aa', fontSize: 16 },
});
