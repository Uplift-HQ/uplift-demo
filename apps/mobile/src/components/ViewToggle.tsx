import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useViewMode, useCanToggleView } from '../contexts/ViewContext';
import { UserIcon, UsersIcon } from './Icons';
import { colors, typography, spacing, borderRadius } from '../theme';

interface ViewToggleProps {
  style?: any;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ style }) => {
  const { t } = useTranslation();
  const { viewMode, toggleView } = useViewMode();
  const canToggle = useCanToggleView();

  // Don't render for workers - they only have personal view
  if (!canToggle) {
    return null;
  }

  const isTeam = viewMode === 'team';

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.option, !isTeam && styles.optionActive]}
        onPress={() => !isTeam ? null : toggleView()}
        activeOpacity={0.7}
      >
        <UserIcon size={16} color={!isTeam ? colors.white : colors.slate600} />
        <Text style={[styles.optionText, !isTeam && styles.optionTextActive]}>
          {t('viewToggle.myView', 'My View')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, isTeam && styles.optionActive]}
        onPress={() => isTeam ? null : toggleView()}
        activeOpacity={0.7}
      >
        <UsersIcon size={16} color={isTeam ? colors.white : colors.slate600} />
        <Text style={[styles.optionText, isTeam && styles.optionTextActive]}>
          {t('viewToggle.teamView', 'Team View')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    borderRadius: borderRadius.full,
    padding: 4,
    alignSelf: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  optionActive: {
    backgroundColor: colors.momentum,
  },
  optionText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.slate600,
  },
  optionTextActive: {
    color: colors.white,
  },
});
