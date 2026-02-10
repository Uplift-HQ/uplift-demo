import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../theme';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}

export const ScreenHeader = ({ title, onBack, rightAction }: ScreenHeaderProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backButton}>← {t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.rightContainer}>
        {rightAction || null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    ...typography.bodyBold,
    color: colors.momentum,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.slate900,
  },
  rightContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
});
