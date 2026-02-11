import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ViewToggle } from '../../components/ViewToggle';
import { ScheduleOverviewScreen } from '../schedule/ScheduleOverviewScreen';
import { colors } from '../../theme';

export const PersonalScheduleScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <ViewToggle />
      </View>
      <ScheduleOverviewScreen navigation={navigation} hideHeader />
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
