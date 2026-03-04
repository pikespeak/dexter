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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import { colors, typography, spacing, radius } from '../theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RegisterNav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const { register } = useAuthStore();
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      setError(t('auth.fieldsRequired'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(email, password, displayName || undefined);
      navigation.goBack();
    } catch (err) {
      setError((err as Error).message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>{t('auth.close')}</Text>
        </TouchableOpacity>

        <View style={styles.headerSpace} />

        <Text style={styles.title}>{t('auth.register')}</Text>
        <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.name')}</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            placeholder={t('auth.namePlaceholder')}
            placeholderTextColor={colors.text.muted}
          />
        </View>

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
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={colors.text.muted}
          />
          <Text style={styles.hint}>{t('auth.passwordMinLength')}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder={t('auth.confirmPasswordPlaceholder')}
            placeholderTextColor={colors.text.muted}
          />
        </View>

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.registerText}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.switchText}>
            {t('auth.hasAccount')}{' '}
            <Text style={styles.switchLink}>{t('auth.loginNow')}</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  inner: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  headerSpace: {
    height: 60,
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
    marginBottom: spacing['2xl'],
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
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  registerButton: {
    backgroundColor: colors.pitch.green,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerText: {
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
