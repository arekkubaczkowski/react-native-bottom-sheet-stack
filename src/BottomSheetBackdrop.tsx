import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useBottomSheetStore } from './bottomSheet.store';

interface BottomSheetBackdropProps {
  sheetId: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Custom backdrop component rendered separately from the scaled sheet content.
 * This ensures the backdrop doesn't scale with the sheet.
 */
export const BottomSheetBackdrop = React.memo(
  ({ sheetId, onPress }: BottomSheetBackdropProps) => {
    const status = useBottomSheetStore(
      (state) => state.sheetsById[sheetId]?.status
    );

    const isVisible = status === 'opening' || status === 'open';

    const opacity = useDerivedValue(() => {
      return withTiming(isVisible ? 1 : 0, { duration: 300 });
    });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
      };
    });

    return (
      <AnimatedPressable
        style={[styles.backdrop, animatedStyle]}
        onPress={onPress}
        pointerEvents={isVisible ? 'auto' : 'none'}
      />
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
