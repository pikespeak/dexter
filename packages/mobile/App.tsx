import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import { piksPeakTheme } from './src/theme/paper';

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
    <PaperProvider theme={piksPeakTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </PaperProvider>
  );
}
