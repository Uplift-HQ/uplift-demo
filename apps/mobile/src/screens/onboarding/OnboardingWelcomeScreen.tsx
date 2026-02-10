import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, TrendingUpIcon, StarIcon, BriefcaseIcon } from '../../components/Icons';
import { UpliftLogo } from '../../components/Logo';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const OnboardingWelcomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <UpliftLogo size={80} />
        <Text style={styles.tagline}>{t('auth.tagline')}</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.title}>{t('onboarding.welcome')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.getStarted')}
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <View style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: colors.momentum + '20' }]}>
            <TrendingUpIcon size={24} color={colors.momentum} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t('home.yourProgress')}</Text>
            <Text style={styles.featureText}>{t('gamification.keepGoing')}</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: colors.success + '20' }]}>
            <StarIcon size={24} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t('skills.title')}</Text>
            <Text style={styles.featureText}>{t('skills.addYourSkills')}</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: colors.info + '20' }]}>
            <BriefcaseIcon size={24} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t('career.jobOpenings')}</Text>
            <Text style={styles.featureText}>{t('career.checkBackLater')}</Text>
          </View>
        </View>
      </View>

      {/* Action */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('OnboardingSkills')}
        >
          <Text style={styles.primaryButtonText}>{t('onboarding.continue')}</Text>
          <ChevronRightIcon size={24} color={colors.background} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  
  logoSection: { alignItems: 'center', paddingTop: spacing.lg, marginBottom: spacing.xl },
  tagline: { ...typography.body, color: colors.slate600, marginTop: spacing.md },
  
  heroSection: { alignItems: 'center', marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.slate900, textAlign: 'center', fontSize: 32, marginBottom: spacing.md },
  subtitle: { ...typography.body, color: colors.slate600, textAlign: 'center', lineHeight: 24, paddingHorizontal: spacing.lg },
  
  featuresSection: { flex: 1, justifyContent: 'center', gap: spacing.md },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.lg },
  featureIcon: { width: 48, height: 48, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { ...typography.bodyBold, color: colors.slate900, marginBottom: spacing.xs },
  featureText: { ...typography.caption, color: colors.slate600, lineHeight: 18 },
  
  actionSection: { paddingBottom: spacing.xl },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, ...shadows.lg },
  primaryButtonText: { ...typography.h3, color: colors.background },
  secondaryButton: { alignItems: 'center', paddingVertical: spacing.md },
  secondaryButtonText: { ...typography.body, color: colors.slate600 },
});
