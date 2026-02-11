import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useViewMode } from '../../contexts/ViewContext';
import { ViewToggle } from '../../components/ViewToggle';
import { ScheduleBuilderScreen } from './ScheduleBuilderScreen';
import { ScheduleOverviewScreen } from '../schedule/ScheduleOverviewScreen';
import { colors } from '../../theme';

export const ManagerScheduleScreen = ({ navigation }: any) => {
  const { isPersonalView } = useViewMode();

  return (
    <View style={styles.container}>
      {/* View Toggle at top */}
      <View style={styles.toggleContainer}>
        <ViewToggle />
      </View>

      {/* Conditional content based on view mode */}
      {isPersonalView ? (
        <ScheduleOverviewScreen navigation={navigation} hideHeader />
      ) : (
        <ScheduleBuilderScreen navigation={navigation} hideHeader />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  toggleContainer: {
    paddingTop: 60,
    paddingBottom: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
