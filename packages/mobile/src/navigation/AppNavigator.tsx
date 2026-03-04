import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PredictionDetailScreen } from '../screens/PredictionDetailScreen';

// Type definitions
export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Paywall: undefined;
  PredictionDetail: { predictionId: string; matchId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Stats: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Tab icon — circle with emoji icon, pitch-green active state.
 */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { t } = useI18n();

  const tabConfig: Record<string, { icon: string; labelKey: string }> = {
    Home: { icon: '⚽', labelKey: 'tab.today' },
    Matches: { icon: '📅', labelKey: 'tab.matches' },
    Stats: { icon: '📊', labelKey: 'tab.stats' },
    Profile: { icon: '👤', labelKey: 'tab.profile' },
  };

  const config = tabConfig[label] || { icon: '•', labelKey: label };

  return (
    <View style={tabStyles.iconContainer}>
      <View style={[tabStyles.iconCircle, focused && tabStyles.iconCircleFocused]}>
        <Text style={{ fontSize: 16, opacity: focused ? 1 : 0.5 }}>{config.icon}</Text>
      </View>
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>
        {t(config.labelKey)}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: tabStyles.tabBar,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['pikspeak://', 'https://pikspeak.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: '',
          Matches: 'matches',
          Stats: 'stats',
          Profile: 'profile',
        },
      },
      PredictionDetail: 'prediction/:predictionId',
      Login: 'login',
      Register: 'register',
      Paywall: 'upgrade',
    },
  },
};

export function AppNavigator() {
  const { isLoading, hasCompletedOnboarding, restoreSession, completeOnboarding } = useAuthStore();
  const { restoreLocale } = useI18n();

  useEffect(() => {
    restoreSession();
    restoreLocale();
  }, []);

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.pitch.green} />
      </View>
    );
  }

  // Show onboarding on first launch
  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="PredictionDetail" component={PredictionDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg.surface,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    height: 82,
    paddingBottom: 22,
    paddingTop: spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleFocused: {
    backgroundColor: colors.pitch.greenFaint,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.muted,
    letterSpacing: 0.3,
  },
  labelFocused: {
    color: colors.pitch.green,
    fontWeight: '700',
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
