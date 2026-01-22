import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { getAnimatedIndex } from './animatedRegistry';
import { useSheetStatus } from './bottomSheet.store';

interface BottomSheetBackdropProps {
  sheetId: string;
  onPress?: () => void;
}

export function BottomSheetBackdrop({
  sheetId,
  onPress,
}: BottomSheetBackdropProps) {
  const status = useSheetStatus(sheetId);

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
