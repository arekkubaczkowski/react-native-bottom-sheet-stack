import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { getAnimatedIndex, HIDDEN_ANIMATED_INDEX } from './animatedRegistry';
import { requestClose } from './bottomSheetCoordinator';

interface BottomSheetBackdropProps {
  sheetId: string;
}

export function BottomSheetBackdrop({ sheetId }: BottomSheetBackdropProps) {
  const animatedIndex = getAnimatedIndex(sheetId);

  if (!animatedIndex) {
    throw new Error('animatedIndex must be defined in BottomSheetBackdrop');
  }

  // Rendered from the first frame, transparent, and faded purely by
  // `animatedIndex` — which the store rewinds to hidden as the sheet starts
  // opening. Deferring the mount instead (as this once did) drops the opening
  // frames the adapter has already driven, so the backdrop pops in part-way
  // through the fade rather than animating from nothing.
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [HIDDEN_ANIMATED_INDEX, 0],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => requestClose(sheetId)}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, animatedStyle, styles.backdrop]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
