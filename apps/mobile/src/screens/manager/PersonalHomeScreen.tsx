import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ViewToggle } from '../../components/ViewToggle';
import { HomeScreen } from '../HomeScreen';
import { colors } from '../../theme';

export const PersonalHomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <ViewToggle />
      </View>
      <HomeScreen navigation={navigation} embedded={true} />
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
