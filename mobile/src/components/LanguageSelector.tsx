// ============================================================
// LANGUAGE SELECTOR COMPONENT
// Allow users to change app language
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  I18nManager,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, changeLanguage, getCurrentLanguage, onLanguageChange } from '../i18n';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import * as Updates from 'expo-updates';

interface LanguageSelectorProps {
  style?: object;
}

export function LanguageSelector({ style }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  // Listen for language changes and update state
  useEffect(() => {
    const unsubscribe = onLanguageChange(() => {
      setCurrentLang(getCurrentLanguage());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Also update when i18n language changes
  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
  }, [i18n.language]);

  const handleLanguageChange = useCallback(async (languageCode: string) => {
    try {
      const previousLang = getCurrentLanguage();
      const newLangInfo = LANGUAGES.find(l => l.code === languageCode);
      const previousRTL = previousLang?.rtl || false;
      const newRTL = newLangInfo?.rtl || false;

      // Close modal immediately for better UX
      setModalVisible(false);

      // Update local language
      await changeLanguage(languageCode);

      // Update state to show new language
      setCurrentLang(getCurrentLanguage());

      // Update server preference (non-blocking)
      try {
        await api.publicRequest('/translation/preference', { method: 'PUT', body: { language: languageCode } });
      } catch (error) {
        // Server update failed, but local change succeeded - that's ok
      }

      // Handle RTL layout change - requires restart
      if (previousRTL !== newRTL) {
        I18nManager.forceRTL(newRTL);
        Alert.alert(
          t('settings.languageChanged', 'Language Changed'),
          t('settings.restartForRTL', 'Please restart the app for the layout to update properly.'),
          [{ text: t('common.ok', 'OK') }]
        );
      }

    } catch (error) {
      Alert.alert(
        t('common.error', 'Error'),
        t('settings.languageChangeFailed', 'Failed to change language. Please try again.')
      );
    }
  }, [t]);

  const renderLanguageItem = useCallback(({ item }: { item: typeof LANGUAGES[0] }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        { borderBottomColor: colors.slate200 },
        item.code === currentLang.code && { backgroundColor: colors.momentumLight },
      ]}
      onPress={() => handleLanguageChange(item.code)}
    >
      <View style={styles.languageInfo}>
        <Text style={[styles.languageName, { color: colors.slate900 }]}>
          {item.nativeName}
        </Text>
        <Text style={[styles.languageNameEn, { color: colors.slate500 }]}>
          {item.name}
        </Text>
      </View>
      {item.code === currentLang.code && (
        <Ionicons name="checkmark-circle" size={24} color={colors.momentum} />
      )}
    </TouchableOpacity>
  ), [currentLang.code, colors, handleLanguageChange]);

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.background }, style]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Ionicons name="globe-outline" size={20} color={colors.slate900} />
          <Text style={[styles.selectorText, { color: colors.slate900 }]}>
            {currentLang.nativeName}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.slate500} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.slate200 }]}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.slate900} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.slate900 }]}>
              {t('settings.selectLanguage', 'Select Language')}
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <Text style={[styles.languageCount, { color: colors.slate500 }]}>
            {LANGUAGES.length} {t('settings.languagesAvailable', 'languages available')}
          </Text>

          <FlatList
            data={LANGUAGES}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
          />
        </View>
      </Modal>
    </>
  );
}

// ============================================================
// TRANSLATE BUTTON COMPONENT
// For translating user-generated content
// ============================================================

interface TranslateButtonProps {
  text: string;
  onTranslated: (translatedText: string) => void;
  style?: object;
}

export function TranslateButton({ text, onTranslated, style }: TranslateButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [originalText, setOriginalText] = useState('');

  const handleTranslate = async () => {
    if (isTranslated) {
      // Show original
      onTranslated(originalText);
      setIsTranslated(false);
      return;
    }

    setIsTranslating(true);
    try {
      const currentLang = getCurrentLanguage();
      const response = await api.publicRequest<{ translatedText: string }>('/translation/translate', {
        method: 'POST',
        body: {
          text,
          targetLanguage: currentLang.code,
        },
      });

      setOriginalText(text);
      onTranslated(response.translatedText);
      setIsTranslated(true);
    } catch (error) {
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.translateButton, style]}
      onPress={handleTranslate}
      disabled={isTranslating}
    >
      <Ionicons
        name={isTranslated ? 'language' : 'language-outline'}
        size={16}
        color={colors.momentum}
      />
      <Text style={[styles.translateText, { color: colors.momentum }]}>
        {isTranslating
          ? t('common.loading', 'Loading...')
          : isTranslated
          ? t('feed.showOriginal', 'Show Original')
          : t('feed.seeTranslation', 'See Translation')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  languageCount: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  languageInfo: {
    gap: 4,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageNameEn: {
    fontSize: 14,
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  translateText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LanguageSelector;
