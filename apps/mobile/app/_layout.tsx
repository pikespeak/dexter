import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#e0e0e0',
          contentStyle: { backgroundColor: '#0f0f23' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Anmelden' }} />
        <Stack.Screen name="predict/[id]" options={{ title: 'Vorhersage' }} />
      </Stack>
    </>
  );
}
