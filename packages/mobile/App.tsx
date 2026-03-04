import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';

/**
 * App entry point.
 * Renders the AppNavigator which handles:
 * - Onboarding flow (first launch)
 * - Tab navigation (Home, Matches, Stats, Profile)
 * - Modal screens (Login, Register, Paywall)
 * - Deep linking (pikspeak://)
 */
export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
