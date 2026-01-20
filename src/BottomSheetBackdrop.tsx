import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { getAnimatedIndex } from './animatedRegistry';
import { useBottomSheetStore } from './bottomSheet.store';

interface BottomSheetBackdropProps {
  sheetId: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Custom backdrop component rendered separately from the scaled sheet content.
 * This ensures the backdrop doesn't scale with the sheet.
 * Opacity is interpolated from the bottom sheet's animatedIndex for smooth animation.
 */
export function BottomSheetBackdrop({
  sheetId,
  onPress,
}: BottomSheetBackdropProps) {
  const status = useBottomSheetStore(
    (state) => state.sheetsById[sheetId]?.status
  );

  const animatedIndex = getAnimatedIndex(sheetId);

  const isVisible = status === 'opening' || status === 'open';

  const animatedStyle = useAnimatedStyle(() => {
    // Interpolate opacity based on animatedIndex
    // -1 = closed, 0+ = open at snap point
    const opacity = interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <AnimatedPressable
      style={[styles.backdrop, animatedStyle]}
      onPress={onPress}
      pointerEvents={isVisible ? 'auto' : 'none'}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
