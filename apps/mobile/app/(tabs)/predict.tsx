import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePrediction } from '../../hooks/usePrediction';

export default function PredictScreen() {
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  const [query, setQuery] = useState('');
  const { isLoading, answer, error, predict, cancel } = usePrediction();

  const handleSubmit = () => {
    if (!query.trim()) return;
    predict(query.trim());
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
        {domain && (
          <Text style={styles.domainLabel}>
            Domäne: {domain}
          </Text>
        )}

        {answer && <Text style={styles.answer}>{answer}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#6c63ff" />
            <Text style={styles.loadingText}>Analyse läuft...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Stelle eine Frage..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          editable={!isLoading}
          multiline
        />
        <Pressable
          style={[styles.button, isLoading && styles.buttonCancel]}
          onPress={isLoading ? cancel : handleSubmit}
        >
          <Text style={styles.buttonText}>{isLoading ? '⏹' : '→'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  results: { flex: 1 },
  resultsContent: { padding: 16 },
  domainLabel: { color: '#6c63ff', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  answer: { color: '#e0e0e0', fontSize: 15, lineHeight: 22 },
  error: { color: '#ff6b6b', fontSize: 14 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    backgroundColor: '#1a1a2e',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f0f23',
    borderRadius: 8,
    padding: 12,
    color: '#e0e0e0',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: { backgroundColor: '#ff6b6b' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
