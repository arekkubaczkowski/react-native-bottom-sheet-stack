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

  // Mounted from the sheet's first frame and faded purely by `animatedIndex`.
  // Gating the mount on a timer instead drops the opening frames the adapter
  // has already driven, and the backdrop pops in mid-fade.
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
