import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import { md3, typography, spacing, shape } from '../theme';
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
        <IconButton
          icon="close"
          iconColor={md3.outline}
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        />

        <Text style={styles.title}>{t('auth.login')}</Text>
        <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
          outlineColor={md3.outlineVariant}
          activeOutlineColor={md3.primary}
          textColor={md3.onSurface}
        />

        <TextInput
          mode="outlined"
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          style={styles.input}
          outlineColor={md3.outlineVariant}
          activeOutlineColor={md3.primary}
          textColor={md3.onSurface}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.loginButton}
          contentStyle={styles.loginButtonContent}
        >
          {t('auth.login')}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.replace('Register')}
          style={styles.switchButton}
          textColor={md3.onSurfaceVariant}
        >
          {t('auth.noAccount')}{' '}{t('auth.registerNow')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
  },
  inner: {
    flex: 1,
    padding: spacing['2xl'],
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: spacing.lg,
    zIndex: 1,
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
    backgroundColor: md3.errorContainer,
    padding: spacing.md,
    borderRadius: shape.medium,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: md3.onErrorContainer,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  input: {
    marginBottom: spacing.lg,
    backgroundColor: md3.surfaceContainerLowest,
  },
  loginButton: {
    borderRadius: shape.full,
    marginTop: spacing.sm,
  },
  loginButtonContent: {
    paddingVertical: 4,
  },
  switchButton: {
    marginTop: spacing.lg,
  },
});
