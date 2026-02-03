import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, BellIcon, CalendarIcon, TrendingUpIcon, MapPinIcon, GlobeIcon, CheckIcon } from '../../components/Icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { showAlert } from '../../utils/alert';
import { useAuthStore } from '../../store/authStore';

// Supported languages
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  { code: 'fr', name: 'French', nativeName: 'Francais' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'ro', name: 'Romanian', nativeName: 'Romana' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'tr', name: 'Turkish', nativeName: 'Turkce' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tieng Viet' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export const OnboardingPreferencesScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [preferences, setPreferences] = useState({
    notifications: {
      shifts: true,
      tasks: true,
      recognition: true,
      opportunities: true,
    },
    availability: {
      morning: false,
      afternoon: true,
      evening: true,
      weekend: true,
    },
    goals: {
      promotion: false,
      skills: false,
      hours: false,
      recognition: false,
    },
    location: 'any',
  });

  const togglePreference = (category: keyof typeof preferences, key: string) => {
    if (category === 'location') return;
    setPreferences({
      ...preferences,
      [category]: {
        ...(preferences[category] as Record<string, boolean>),
        [key]: !(preferences[category] as Record<string, boolean>)[key],
      },
    });
  };

  const { completeOnboarding } = useAuthStore();

  const handleComplete = async () => {
    await completeOnboarding();
    showAlert(
      "You're all set!",
      'Welcome to Uplift. Your profile is ready.',
      [
        {
          text: 'Get Started',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          }),
        }
      ]
    );
  };

  const renderLanguageItem = ({ item }: { item: typeof LANGUAGES[0] }) => (
    <TouchableOpacity 
      style={[styles.languageItem, item.code === selectedLanguage.code && styles.languageItemSelected]}
      onPress={() => {
        setSelectedLanguage(item);
        setLanguageModalVisible(false);
      }}
    >
      <View>
        <Text style={styles.languageNative}>{item.nativeName}</Text>
        <Text style={styles.languageNameText}>{item.name}</Text>
      </View>
      {item.code === selectedLanguage.code && <CheckIcon size={20} color={colors.momentum} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.stepText}>{t('screens.onboardingPrefs.step_2_of_2')}</Text>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{t('screens.onboardingPrefs.set_your_preferences')}</Text>
        <Text style={styles.subtitle}>
          Customize your Uplift experience. You can change these anytime.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Selection - First section for easy access */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <GlobeIcon size={24} color={colors.momentum} />
            <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('screens.onboardingPrefs.choose_your_preferred_language')}</Text>
          
          <TouchableOpacity 
            style={styles.languageSelector}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View>
              <Text style={styles.selectedLanguageNative}>{selectedLanguage.nativeName}</Text>
              <Text style={styles.selectedLanguageName}>{selectedLanguage.name}</Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
          
          <Text style={styles.languageHint}>
            Feed posts and messages can be translated on demand
          </Text>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BellIcon size={24} color={colors.momentum} />
            <Text style={styles.sectionTitle}>{t('navigation.notifications')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('screens.onboardingPrefs.what_should_we_alert_you_about')}</Text>
          
          <View style={styles.optionsGrid}>
            {[
              { key: 'shifts', label: 'Shift Updates' },
              { key: 'tasks', label: 'New Tasks' },
              { key: 'recognition', label: 'Recognition' },
              { key: 'opportunities', label: 'Opportunities' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionChip,
                  preferences.notifications[option.key as keyof typeof preferences.notifications] && styles.optionChipSelected
                ]}
                onPress={() => togglePreference('notifications', option.key)}
              >
                {preferences.notifications[option.key as keyof typeof preferences.notifications] && (
                  <CheckCircleIcon size={16} color={colors.success} />
                )}
                <Text style={[
                  styles.optionText,
                  preferences.notifications[option.key as keyof typeof preferences.notifications] && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={24} color={colors.info} />
            <Text style={styles.sectionTitle}>{t('profile.availability')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('screens.onboardingPrefs.when_are_you_typically_available_to_work')}</Text>
          
          <View style={styles.optionsGrid}>
            {[
              { key: 'morning', label: 'Mornings' },
              { key: 'afternoon', label: 'Afternoons' },
              { key: 'evening', label: 'Evenings' },
              { key: 'weekend', label: 'Weekends' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionChip,
                  preferences.availability[option.key as keyof typeof preferences.availability] && styles.optionChipSelected
                ]}
                onPress={() => togglePreference('availability', option.key)}
              >
                {preferences.availability[option.key as keyof typeof preferences.availability] && (
                  <CheckCircleIcon size={16} color={colors.success} />
                )}
                <Text style={[
                  styles.optionText,
                  preferences.availability[option.key as keyof typeof preferences.availability] && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUpIcon size={24} color={colors.success} />
            <Text style={styles.sectionTitle}>{t('screens.onboardingPrefs.your_goals')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('screens.onboardingPrefs.what_are_you_working_towards')}</Text>
          
          <View style={styles.optionsGrid}>
            {[
              { key: 'promotion', label: 'Get promoted' },
              { key: 'skills', label: 'Learn new skills' },
              { key: 'hours', label: 'More hours' },
              { key: 'recognition', label: 'Get recognized' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionChip,
                  preferences.goals[option.key as keyof typeof preferences.goals] && styles.optionChipSelected
                ]}
                onPress={() => togglePreference('goals', option.key)}
              >
                {preferences.goals[option.key as keyof typeof preferences.goals] && (
                  <CheckCircleIcon size={16} color={colors.success} />
                )}
                <Text style={[
                  styles.optionText,
                  preferences.goals[option.key as keyof typeof preferences.goals] && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPinIcon size={24} color={colors.warning} />
            <Text style={styles.sectionTitle}>{t('screens.onboardingPrefs.location_preference')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('screens.onboardingPrefs.where_are_you_willing_to_work')}</Text>
          
          <View style={styles.locationOptions}>
            {[
              { key: 'any', label: 'Any location' },
              { key: 'current', label: 'Current store only' },
              { key: 'nearby', label: 'Within 10 miles' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.locationOption,
                  preferences.location === option.key && styles.locationOptionSelected
                ]}
                onPress={() => setPreferences({ ...preferences, location: option.key })}
              >
                <View style={[
                  styles.radioOuter,
                  preferences.location === option.key && styles.radioOuterSelected
                ]}>
                  {preferences.location === option.key && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.locationText,
                  preferences.location === option.key && styles.locationTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Action */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleComplete}
        >
          <CheckCircleIcon size={24} color={colors.background} />
          <Text style={styles.primaryButtonText}>{t('screens.onboardingPrefs.complete_setup')}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.modalClose}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={LANGUAGES}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  header: { paddingHorizontal: spacing.xl, paddingTop: 60, marginBottom: spacing.lg },
  progressBar: { height: 6, backgroundColor: colors.slate200, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.momentum, borderRadius: 3 },
  stepText: { ...typography.caption, color: colors.slate600, textAlign: 'center' },
  
  titleSection: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.slate900, fontSize: 28, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.slate600, lineHeight: 22 },
  
  content: { flex: 1, paddingHorizontal: spacing.xl },
  
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.slate900 },
  sectionSubtitle: { ...typography.caption, color: colors.slate600, marginBottom: spacing.md },
  
  // Language selector styles
  languageSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.slate100, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.momentum + '30' },
  selectedLanguageNative: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  selectedLanguageName: { ...typography.caption, color: colors.slate600, marginTop: 2 },
  changeText: { ...typography.bodyBold, color: colors.momentum },
  languageHint: { ...typography.caption, color: colors.slate500, marginTop: spacing.sm, fontStyle: 'italic' },
  
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.slate100, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 2, borderColor: 'transparent' },
  optionChipSelected: { backgroundColor: colors.success + '15', borderColor: colors.success },
  optionText: { ...typography.body, color: colors.slate700 },
  optionTextSelected: { color: colors.success, fontWeight: '600' },
  
  locationOptions: { gap: spacing.sm },
  locationOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.slate100, borderRadius: borderRadius.md, borderWidth: 2, borderColor: 'transparent' },
  locationOptionSelected: { backgroundColor: colors.momentum + '10', borderColor: colors.momentum },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.slate400, alignItems: 'center', justifyContent: 'center' },
  radioOuterSelected: { borderColor: colors.momentum },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.momentum },
  locationText: { ...typography.body, color: colors.slate700 },
  locationTextSelected: { color: colors.momentum, fontWeight: '600' },
  
  actionSection: { padding: spacing.xl },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.momentum, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, ...shadows.lg },
  primaryButtonText: { ...typography.h3, color: colors.background },
  
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.slate200 },
  modalTitle: { ...typography.h2, color: colors.slate900 },
  modalClose: { ...typography.bodyBold, color: colors.momentum },
  languageItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  languageItemSelected: { backgroundColor: colors.momentum + '10' },
  languageNative: { ...typography.bodyBold, color: colors.slate900, fontSize: 16 },
  languageNameText: { ...typography.caption, color: colors.slate600, marginTop: 2 },
});
