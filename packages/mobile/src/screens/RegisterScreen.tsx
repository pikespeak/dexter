import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button, HelperText, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import { md3, typography, spacing, shape } from '../theme';
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
        <IconButton
          icon="close"
          iconColor={md3.outline}
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        />

        <View style={styles.headerSpace} />

        <Text style={styles.title}>{t('auth.register')}</Text>
        <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label={t('auth.name')}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          style={styles.input}
          outlineColor={md3.outlineVariant}
          activeOutlineColor={md3.primary}
          textColor={md3.onSurface}
        />

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

        <View>
          <TextInput
            mode="outlined"
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            outlineColor={md3.outlineVariant}
            activeOutlineColor={md3.primary}
            textColor={md3.onSurface}
          />
          <HelperText type="info" style={styles.hint}>
            {t('auth.passwordMinLength')}
          </HelperText>
        </View>

        <TextInput
          mode="outlined"
          label={t('auth.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          outlineColor={md3.outlineVariant}
          activeOutlineColor={md3.primary}
          textColor={md3.onSurface}
        />

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={styles.registerButton}
          contentStyle={styles.registerButtonContent}
        >
          {t('auth.register')}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.replace('Login')}
          style={styles.switchButton}
          textColor={md3.onSurfaceVariant}
        >
          {t('auth.hasAccount')}{' '}{t('auth.loginNow')}
        </Button>

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: md3.surfaceContainerLowest,
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
    marginBottom: spacing['2xl'],
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
    marginBottom: spacing.sm,
    backgroundColor: md3.surfaceContainerLowest,
  },
  hint: {
    marginBottom: spacing.xs,
  },
  registerButton: {
    borderRadius: shape.full,
    marginTop: spacing.sm,
  },
  registerButtonContent: {
    paddingVertical: 4,
  },
  switchButton: {
    marginTop: spacing.lg,
  },
});
