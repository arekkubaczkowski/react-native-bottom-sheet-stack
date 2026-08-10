import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { getAnimatedIndex, HIDDEN_ANIMATED_INDEX } from './animatedRegistry';
import { useBottomSheetManagerContext } from './BottomSheetManager.context';
import { requestClose } from './bottomSheetCoordinator';
import { useSheetBackdrop } from './store';

interface BottomSheetBackdropProps {
  sheetId: string;
}

export function BottomSheetBackdrop({ sheetId }: BottomSheetBackdropProps) {
  const animatedIndex = getAnimatedIndex(sheetId);
  const { backdropConfig: groupConfig } = useBottomSheetManagerContext();
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

  // QueueItem already gates rendering on `false`; treating it as "no config"
  // here keeps this component correct on its own.
  const sheetConfig = storedBackdrop === false ? undefined : storedBackdrop;

  // The visual choice is atomic — a sheet-level config replaces the group's
  // entirely, so a group's custom component never bleeds under a sheet that
  // asked for a styled scrim. Only `pressToDismiss` resolves per field.
  const visual = sheetConfig ?? groupConfig;
  const pressToDismiss =
    sheetConfig?.pressToDismiss ?? groupConfig?.pressToDismiss ?? true;

  let rendered;
  if (visual?.kind === 'custom') {
    const CustomBackdrop = visual.component;
    // The component owns its own fade off `animatedIndex` — applying the
    // built-in opacity on top would double-fade it.
    rendered = (
      <CustomBackdrop
        sheetId={sheetId}
        animatedIndex={animatedIndex}
        close={() => requestClose(sheetId)}
      />
    );
  } else {
    const groupStyle =
      groupConfig?.kind === 'styled' ? groupConfig.style : undefined;
    const sheetStyle =
      sheetConfig?.kind === 'styled' ? sheetConfig.style : undefined;
    rendered = (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          animatedStyle,
          styles.backdrop,
          groupStyle,
          sheetStyle,
        ]}
      />
    );
  }

  // The Pressable stays even with tap-to-dismiss off — a backdrop blocks
  // touches from reaching the content beneath it either way.
  return (
    <Pressable
      testID={`bottom-sheet-backdrop-${sheetId}`}
      style={StyleSheet.absoluteFill}
      onPress={pressToDismiss ? () => requestClose(sheetId) : undefined}
    >
      {rendered}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
