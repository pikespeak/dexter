import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../stores/auth';

/**
 * Profile Screen - User settings and subscription management
 */
export function ProfileScreen() {
  const { user, isAuthenticated, plan, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout },
    ]);
  };

  const planLabel: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    premium: 'Premium',
  };

  const planColor: Record<string, string> = {
    free: '#8888aa',
    pro: '#4444ff',
    premium: '#f59e0b',
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>
            Melde dich an, um deine Vorhersagen zu verwalten
          </Text>
          <TouchableOpacity style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Anmelden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton}>
            <Text style={styles.registerButtonText}>Konto erstellen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.displayName || 'Nutzer'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Abonnement</Text>
        <View style={styles.planCard}>
          <View style={[styles.planBadge, { backgroundColor: planColor[plan] + '20' }]}>
            <Text style={[styles.planBadgeText, { color: planColor[plan] }]}>
              {planLabel[plan] || 'Free'}
            </Text>
          </View>
          {plan === 'free' && (
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>Upgrade auf Pro</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Einstellungen</Text>

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Push-Benachrichtigungen</Text>
          <Text style={styles.settingsValue}>An</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Sprache</Text>
          <Text style={styles.settingsValue}>Deutsch</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Datenschutz</Text>
          <Text style={styles.settingsChevron}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>AGB</Text>
          <Text style={styles.settingsChevron}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      <Text style={styles.version}>PiksPeak v0.1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6666aa', textTransform: 'uppercase', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4444ff', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  userName: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  userEmail: { fontSize: 14, color: '#8888aa' },
  planCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a4e',
  },
  planBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  planBadgeText: { fontWeight: '700', fontSize: 14 },
  upgradeButton: { backgroundColor: '#4444ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  upgradeText: { color: '#ffffff', fontWeight: '600' },
  settingsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  settingsLabel: { fontSize: 16, color: '#ffffff' },
  settingsValue: { fontSize: 14, color: '#8888aa' },
  settingsChevron: { fontSize: 16, color: '#8888aa' },
  logoutButton: { marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#2a1a1a', alignItems: 'center' },
  logoutText: { fontSize: 16, color: '#ef4444', fontWeight: '600' },
  loginPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loginText: { fontSize: 16, color: '#8888aa', textAlign: 'center', marginBottom: 24 },
  loginButton: { backgroundColor: '#4444ff', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginBottom: 12, width: '100%', alignItems: 'center' },
  loginButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  registerButton: { paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center' },
  registerButtonText: { color: '#4444ff', fontWeight: '600', fontSize: 16 },
  version: { textAlign: 'center', color: '#444466', fontSize: 12, marginTop: 20, marginBottom: 40 },
});
