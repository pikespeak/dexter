import { View, Text, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Verlauf</Text>
      <Text style={styles.empty}>Noch keine Vorhersagen. Starte eine neue Analyse!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', padding: 20 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 16 },
  empty: { color: '#666', fontSize: 14 },
});
