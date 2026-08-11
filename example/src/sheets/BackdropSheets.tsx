import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { BlurView } from 'expo-blur';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  HIDDEN_ANIMATED_INDEX,
  useBottomSheetContext,
  useBottomSheetManager,
  type BackdropComponentProps,
} from 'react-native-bottom-sheet-stack';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
} from 'react-native-reanimated';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * The three things a backdrop config can be, stacked on top of each other so
 * the resolution rules are visible rather than described.
 *
 * The provider sets no group default here, so every sheet below shows its own
 * `backdrop` prop against the built-in `rgba(0,0,0,0.5)` scrim.
 */

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * Defined at module scope on purpose: the config is compared by component
 * identity, so an inline arrow would be a new type every render — remounting
 * the backdrop and restarting the blur each time.
 */
function BlurBackdrop({ animatedIndex }: BackdropComponentProps) {
  // Driven from the sheet's live position rather than a pre-computed opacity,
  // so the blur ramps with the sheet on open, close and drag-to-dismiss.
  const animatedProps = useAnimatedProps(() => ({
    intensity: interpolate(
      animatedIndex.value,
      [HIDDEN_ANIMATED_INDEX, 0],
      [0, 60],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <AnimatedBlurView
      tint="dark"
      style={StyleSheet.absoluteFill}
      animatedProps={animatedProps}
    />
  );
}

export const BackdropDemo = forwardRef<BottomSheetMethods>((_, ref) => {
  const { open } = useBottomSheetManager();
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref}>
      <Badge label="default scrim" color={colors.primary} />
      <Text style={sharedStyles.h1}>Backdrop</Text>
      <Text style={sharedStyles.text}>
        This sheet passes no `backdrop` prop, so it gets the built-in
        `rgba(0,0,0,0.5)` scrim. Push the others on top to compare — each one
        keeps the same stack-aware layering and tap-to-dismiss.
      </Text>

      <View style={{ gap: 12 }}>
        <Button
          title="Blur backdrop (kind: 'custom')"
          style={{ backgroundColor: colors.cyan }}
          onPress={() => open(<BlurBackdropSheet />, { mode: 'push' })}
        />
        <Button
          title="Tinted scrim (kind: 'styled')"
          style={{ backgroundColor: colors.purpleDark }}
          onPress={() => open(<TintedBackdropSheet />, { mode: 'push' })}
        />
        <Button
          title="No tap-to-dismiss (pressToDismiss: false)"
          style={{ backgroundColor: colors.warningDark }}
          onPress={() => open(<StubbornBackdropSheet />, { mode: 'push' })}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

BackdropDemo.displayName = 'BackdropDemo';

export const BlurBackdropSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet ref={ref} backdrop={{ kind: 'custom', component: BlurBackdrop }}>
      <Badge label="kind: 'custom'" color={colors.cyan} />
      <Text style={sharedStyles.h1}>Blur</Text>
      <Text style={sharedStyles.text}>
        An `expo-blur` view replaces the scrim entirely. It reads the sheet's
        `animatedIndex` itself, so the blur ramps 0 → 60 with the sheet instead
        of popping in — drag the sheet down slowly to see it follow.
      </Text>
      <SecondaryButton title="Close" onPress={close} />
    </Sheet>
  );
});

BlurBackdropSheet.displayName = 'BlurBackdropSheet';

export const TintedBackdropSheet = forwardRef<BottomSheetMethods>((_, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <Sheet
      ref={ref}
      backdrop={{
        kind: 'styled',
        style: { backgroundColor: 'rgba(88, 28, 135, 0.75)' },
      }}
    >
      <Badge label="kind: 'styled'" color={colors.purple} />
      <Text style={sharedStyles.h1}>Tinted scrim</Text>
      <Text style={sharedStyles.text}>
        Only the style changes — the manager still owns the fade, the z-index
        and the tap. A style is merged over the default, so a brand tint needs
        one property, not a whole component.
      </Text>
      <SecondaryButton title="Close" onPress={close} />
    </Sheet>
  );
});

TintedBackdropSheet.displayName = 'TintedBackdropSheet';

export const StubbornBackdropSheet = forwardRef<BottomSheetMethods>(
  (_, ref) => {
    const { close } = useBottomSheetContext();

    return (
      <Sheet ref={ref} backdrop={{ kind: 'styled', pressToDismiss: false }}>
        <Badge label="pressToDismiss: false" color={colors.warning} />
        <Text style={sharedStyles.h1}>Tap does nothing</Text>
        <Text style={sharedStyles.text}>
          The backdrop still blocks touches from reaching the sheet underneath —
          it just no longer closes this one. That is the difference from{' '}
          {'`backdrop={false}`'}, which removes the layer entirely.
        </Text>
        <SecondaryButton title="Close" onPress={close} />
      </Sheet>
    );
  }
);

StubbornBackdropSheet.displayName = 'StubbornBackdropSheet';
