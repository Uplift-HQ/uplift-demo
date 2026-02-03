import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useBranding, ORG_SLUG_KEY } from '../contexts/BrandingContext';
import { Button } from '../components/Button';
import { UpliftLogo } from '../components/Logo';
import { LockIcon, UnlockIcon, MailIcon } from '../components/Icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { showAlert } from '../utils/alert';

export const LoginScreen = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading } = useAuthStore();
  const { branding, loading: brandingLoading, fetchBranding } = useBranding();

  // Load last used org slug
  useEffect(() => {
    (async () => {
      try {
        const slug = await AsyncStorage.getItem(ORG_SLUG_KEY);
        if (slug) {
          setCompanyCode(slug);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleCompanyCodeBlur = async () => {
    setCompanyError('');
    if (!companyCode.trim()) return;
    const success = await fetchBranding(companyCode);
    if (!success) {
      setCompanyError('Company not found');
    }
  };

  const primaryColor = branding.primaryColor || colors.momentum;

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert(t('common.error'), t('auth.enterEmailPassword'));
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      showAlert(t('auth.loginFailed'), t('auth.loginError'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          {branding.logoUrl ? (
            <Image
              source={{ uri: branding.logoUrl }}
              style={{ width: 80, height: 80, resizeMode: 'contain' }}
            />
          ) : (
            <UpliftLogo size={80} color={primaryColor} />
          )}
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Company Code */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Company code (optional)"
              placeholderTextColor={colors.slate400}
              value={companyCode}
              onChangeText={(text) => {
                setCompanyCode(text);
                setCompanyError('');
              }}
              onBlur={handleCompanyCodeBlur}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {companyError ? (
            <Text style={styles.companyError}>{companyError}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <MailIcon size={20} color={colors.slate400} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.slate400}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <LockIcon size={20} color={colors.slate400} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.slate400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <UnlockIcon size={20} color={colors.slate400} />
              ) : (
                <LockIcon size={20} color={colors.slate400} />
              )}
            </TouchableOpacity>
          </View>

          <Button
            title={t('auth.login')}
            onPress={handleLogin}
            loading={isLoading || brandingLoading}
            style={[styles.loginButton, { backgroundColor: primaryColor }]}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
          <TouchableOpacity onPress={() => showAlert(t('auth.requestAccess'), t('auth.requestAccessMsg'))}>
            <Text style={[styles.link, { color: primaryColor }]}>{t('auth.contactManager')}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  tagline: {
    ...typography.body,
    color: colors.slate600,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate50,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.slate900,
    paddingVertical: spacing.sm,
  },
  companyError: {
    ...typography.small,
    color: colors.error,
    marginTop: -8,
    marginStart: spacing.md,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  biometricButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.body,
    color: colors.slate600,
  },
  link: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
});
