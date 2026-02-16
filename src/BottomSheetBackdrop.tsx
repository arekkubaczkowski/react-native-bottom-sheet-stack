import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { getAnimatedIndex } from './animatedRegistry';
import { requestClose } from './bottomSheetCoordinator';

interface BottomSheetBackdropProps {
  sheetId: string;
}

export function BottomSheetBackdrop({ sheetId }: BottomSheetBackdropProps) {
  const animatedIndex = getAnimatedIndex(sheetId);

  if (!animatedIndex) {
    throw new Error('animatedIndex must be defined in BottomSheetBackdrop');
  }

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setInitialized(true);
    }, 64);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  if (!initialized) {
    return null;
  }

  return (
    <Pressable
      style={StyleSheet.absoluteFillObject}
      onPress={() => void requestClose(sheetId)}
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
