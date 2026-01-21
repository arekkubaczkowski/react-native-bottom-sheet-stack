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
  // Only allow interaction when fully open - prevents animation conflicts
  const isInteractive = status === 'open';

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <Pressable
      style={StyleSheet.absoluteFillObject}
      onPress={() => {
        if (isInteractive) {
          onPress?.();
        }
      }}
    >
      <Animated.View
        style={[StyleSheet.absoluteFillObject, animatedStyle, styles.backdrop]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
