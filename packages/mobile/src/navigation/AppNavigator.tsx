import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator, Icon } from 'react-native-paper';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import { md3, colors, spacing, shape } from '../theme';
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
 * M3 Navigation Bar icon — pill-shaped active indicator.
 */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { t } = useI18n();

  const tabConfig: Record<string, { icon: string; labelKey: string }> = {
    Home: { icon: 'soccer', labelKey: 'tab.today' },
    Matches: { icon: 'calendar', labelKey: 'tab.matches' },
    Stats: { icon: 'chart-bar', labelKey: 'tab.stats' },
    Profile: { icon: 'account', labelKey: 'tab.profile' },
  };

  const config = tabConfig[label] || { icon: 'circle', labelKey: label };

  return (
    <View style={tabStyles.iconContainer}>
      {/* M3 active indicator pill */}
      <View style={[tabStyles.indicatorPill, focused && tabStyles.indicatorPillActive]}>
        <Icon
          source={config.icon}
          size={22}
          color={focused ? md3.onSecondaryContainer : md3.onSurfaceVariant}
        />
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
        <ActivityIndicator size="large" color={md3.primary} />
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
          contentStyle: { backgroundColor: md3.surfaceContainerLowest },
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
    backgroundColor: md3.surfaceContainer,
    borderTopColor: md3.outlineVariant,
    borderTopWidth: 0,
    height: 80,
    paddingBottom: 16,
    paddingTop: spacing.sm,
    elevation: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
  },
  // M3 pill indicator
  indicatorPill: {
    width: 64,
    height: 32,
    borderRadius: shape.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorPillActive: {
    backgroundColor: md3.secondaryContainer,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: md3.onSurfaceVariant,
  },
  labelFocused: {
    color: md3.onSurface,
    fontWeight: '600',
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
