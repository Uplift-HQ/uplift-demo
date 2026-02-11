import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ViewToggle } from '../../components/ViewToggle';
import { TasksScreen } from '../TasksScreen';
import { colors } from '../../theme';

export const PersonalTasksScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <ViewToggle />
      </View>
      <View style={styles.content}>
        <TasksScreen navigation={navigation} hideHeader />
      </View>
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
  content: {
    flex: 1,
  },
});
