import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const { login } = useAuthStore();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.fieldsRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigation.goBack();
    } catch (err) {
      setError((err as Error).message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>{t('auth.close')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('auth.login')}</Text>
        <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.text.muted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={colors.text.muted}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.loginText}>{t('auth.login')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => navigation.replace('Register')}
        >
          <Text style={styles.switchText}>
            {t('auth.noAccount')}{' '}
            <Text style={styles.switchLink}>{t('auth.registerNow')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  inner: {
    flex: 1,
    padding: spacing['2xl'],
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing['2xl'],
    zIndex: 1,
    padding: spacing.sm,
  },
  closeText: {
    ...typography.bodySmall,
    color: colors.text.muted,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing['3xl'],
  },
  errorBanner: {
    backgroundColor: colors.alert.redFaint,
    borderWidth: 1,
    borderColor: colors.alert.redMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.alert.red,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.overline,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  loginButton: {
    backgroundColor: colors.pitch.green,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 17,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  switchText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  switchLink: {
    color: colors.pitch.green,
    fontWeight: '600',
  },
});
