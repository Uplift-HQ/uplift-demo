import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
  color?: string;
}

// UPLIFT - Pure wordmark in 900 weight (as creative council specified)
// Arrow-in-T detail is too subtle for mobile - keeping it clean
export const UpliftLogo: React.FC<LogoProps> = ({ 
  size = 120, 
  color = '#FF732D' 
}) => {
  return (
    <View style={styles.logoContainer}>
      <Text style={[styles.wordmark, { color, fontSize: size * 0.35, letterSpacing: 2 }]}>
        UPLIFT
      </Text>
    </View>
  );
};

// Simple mark - just U
export const UpliftMark: React.FC<LogoProps> = ({ 
  size = 48, 
  color = '#FF732D' 
}) => {
  return (
    <View style={styles.logoContainer}>
      <Text style={[styles.wordmark, { color, fontSize: size * 0.6 }]}>
        U
      </Text>
    </View>
  );
};

// Horizontal wordmark
export const UpliftWordmark: React.FC<LogoProps> = ({ 
  size = 120, 
  color = '#FF732D' 
}) => {
  return (
    <UpliftLogo size={size} color={color} />
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight: '900', // Industrial strength
    textTransform: 'uppercase',
  },
});
