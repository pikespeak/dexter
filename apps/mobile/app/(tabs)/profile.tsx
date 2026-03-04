import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profil</Text>
      <Text style={styles.info}>Einstellungen und Account-Verwaltung</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', padding: 20 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 16 },
  info: { color: '#666', fontSize: 14 },
});
