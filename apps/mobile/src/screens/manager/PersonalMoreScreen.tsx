import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ViewToggle } from '../../components/ViewToggle';
import { MoreScreen } from '../MoreScreen';
import { colors } from '../../theme';

export const PersonalMoreScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <ViewToggle />
      </View>
      <View style={styles.content}>
        <MoreScreen navigation={navigation} hideHeader />
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
