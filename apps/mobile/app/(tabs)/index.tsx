import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';

const DOMAINS = [
  { id: 'finance', icon: '📈', title: 'Finanzen', desc: 'Aktien, DCF, Krypto' },
  { id: 'real-estate', icon: '🏠', title: 'Immobilien', desc: 'Bewertung, Mietpreise' },
  { id: 'weather', icon: '🌤️', title: 'Wetter', desc: 'Prognosen, Klima' },
  { id: 'sports', icon: '⚽', title: 'Sport', desc: 'Spielvorhersagen' },
  { id: 'health', icon: '💪', title: 'Gesundheit', desc: 'Fitness, Ernährung' },
  { id: 'energy', icon: '⚡', title: 'Energie', desc: 'Preise, Rohstoffe' },
];

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Dexter Predictions</Text>
      <Text style={styles.subheading}>Wähle eine Domäne für deine Vorhersage</Text>

      <View style={styles.grid}>
        {DOMAINS.map((d) => (
          <Pressable
            key={d.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/(tabs)/predict', params: { domain: d.id } })}
          >
            <Text style={styles.icon}>{d.icon}</Text>
            <Text style={styles.cardTitle}>{d.title}</Text>
            <Text style={styles.cardDesc}>{d.desc}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  content: { padding: 20 },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#888', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  icon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#e0e0e0', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#888' },
});
