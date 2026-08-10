import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { getAnimatedIndex, HIDDEN_ANIMATED_INDEX } from './animatedRegistry';
import { resolveBackdrop } from './backdrop.resolve';
import { useBottomSheetManagerContext } from './BottomSheetManager.context';
import { requestClose } from './bottomSheetCoordinator';
import { useSheetBackdrop } from './store';

interface BottomSheetBackdropProps {
  sheetId: string;
}

export function BottomSheetBackdrop({ sheetId }: BottomSheetBackdropProps) {
  const animatedIndex = getAnimatedIndex(sheetId);
  const { backdrop: groupBackdrop } = useBottomSheetManagerContext();
  const storedBackdrop = useSheetBackdrop(sheetId);

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

  const backdrop = resolveBackdrop(storedBackdrop, groupBackdrop);
  const close = () => requestClose(sheetId);

  // The Pressable stays even with tap-to-dismiss off — a backdrop blocks
  // touches from reaching the content beneath it either way. (`backdrop={false}`
  // removes the shield too; that is the difference between the two.)
  return (
    <Pressable
      testID={`bottom-sheet-backdrop-${sheetId}`}
      style={StyleSheet.absoluteFill}
      onPress={backdrop.pressToDismiss ? close : undefined}
    >
      {backdrop.kind === 'custom' ? (
        // A custom component owns its own fade off `animatedIndex`; applying
        // the built-in opacity on top would double-fade it.
        <backdrop.component
          sheetId={sheetId}
          animatedIndex={animatedIndex}
          close={close}
        />
      ) : (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            ...backdrop.styles,
            // Last, so a `style` carrying its own `opacity` restyles the scrim
            // without silently replacing the fade the manager drives.
            animatedStyle,
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
