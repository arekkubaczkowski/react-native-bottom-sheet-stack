---
sidebar_position: 6
---

# Backdrop

Every sheet gets a shared, stack-aware backdrop rendered by the manager: it sits outside the scale transform, layers correctly under its own sheet and above the one beneath, fades with the sheet's live `animatedIndex`, and closes the sheet on tap through the `onBeforeClose` interceptor path.

By default it is a `rgba(0, 0, 0, 0.5)` scrim. Two levels make it configurable — the sheet's choice wins over the group's:

1. **Group default** — `backdropConfig` on `BottomSheetManagerProvider`
2. **Per sheet** — the `backdrop` prop on any shipped adapter (`false` disables it)

## BackdropConfig

A discriminated union — `kind` says what the backdrop renders:

```tsx
type BackdropConfig =
  | {
      kind: 'styled';
      /** Merged over the group's style and the default rgba(0,0,0,0.5). */
      style?: StyleProp<ViewStyle>;
      /** Tap closes the sheet. Default: true. */
      pressToDismiss?: boolean;
    }
  | {
      kind: 'custom';
      /** Replaces the built-in backdrop view entirely. */
      component: ComponentType<BackdropComponentProps>;
      pressToDismiss?: boolean;
    };
```

Only the *look* is configurable. Mount timing, z-index/stack handling, and tap routing through `requestClose` (so `onBeforeClose` interceptors still run) stay with the manager in every variant.

## Theming a group

```tsx
<BottomSheetManagerProvider
  id="default"
  backdropConfig={{ kind: 'styled', style: { backgroundColor: 'rgba(0, 0, 0, 0.75)' } }}
>
  ...
</BottomSheetManagerProvider>
```

## Per-sheet configuration

Pass `backdrop` to the adapter, right where the sheet's other visual props live — it works the same in inline, portal, and persistent mode:

```tsx
// A light scrim for a small action sheet
<GorhomSheetAdapter backdrop={{ kind: 'styled', style: { backgroundColor: 'rgba(0, 0, 0, 0.2)' } }}>

// No backdrop at all
<SwmansionSheetAdapter backdrop={false}>

// Keep the backdrop, but don't close on tap
<CustomModalAdapter backdrop={{ kind: 'styled', pressToDismiss: false }}>
```

Resolution is per field for `pressToDismiss`, and **atomic for the visual choice**: a sheet-level config replaces the group's rendering entirely (a group `custom` component never bleeds under a sheet that asked for `styled`). When both levels are `styled`, their styles compose — group over default, sheet over group.

## Custom component (blur, gradients)

`kind: 'custom'` replaces the rendered backdrop with your own component — the common case is a blur:

```tsx
import { BlurView } from 'expo-blur';
import Animated, {
  interpolate,
  useAnimatedProps,
  Extrapolation,
} from 'react-native-reanimated';
import {
  HIDDEN_ANIMATED_INDEX,
  type BackdropComponentProps,
} from 'react-native-bottom-sheet-stack';

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

function BlurBackdrop({ animatedIndex }: BackdropComponentProps) {
  const animatedProps = useAnimatedProps(() => ({
    intensity: interpolate(
      animatedIndex.value,
      [HIDDEN_ANIMATED_INDEX, 0],
      [0, 40],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <AnimatedBlur style={StyleSheet.absoluteFill} animatedProps={animatedProps} />
  );
}

<GorhomSheetAdapter backdrop={{ kind: 'custom', component: BlurBackdrop }}>
```

The component receives the sheet's raw `animatedIndex` (`-1` hidden → `0` fully visible, exported as `HIDDEN_ANIMATED_INDEX` → `0`) rather than a pre-computed opacity, so blur intensity, gradients, or anything else can be driven from the sheet's real position on the UI thread — exactly how the built-in backdrop drives its own fade. That also means a custom component owns its fade entirely: render it visible and it will pop in instead of fading.

```tsx
type BackdropComponentProps = {
  sheetId: string;
  animatedIndex: SharedValue<number>;
  /** Calls requestClose(sheetId) — onBeforeClose interceptors still run. */
  close: () => void;
};
```

Tap-to-dismiss keeps working around a custom component (the manager's own pressable wraps it); use `pressToDismiss: false` to turn it off, or the `close` prop to wire your own gesture.

## Adapter authors

Third-party adapters reach parity with one hook:

```tsx
import { useAdapterBackdrop, type BackdropConfig } from 'react-native-bottom-sheet-stack';

function MyAdapter({ backdrop, ...props }: { backdrop?: BackdropConfig | false }) {
  const { id } = useBottomSheetContext();
  useAdapterBackdrop(id, backdrop);
  // ...
}
```

`useSetBackdrop` remains for imperative control: `setBackdrop(id, false)` suppresses the shared backdrop (what `GorhomSheetAdapter` does when you hand it a custom `backdropComponent`), `setBackdrop(id, config)` restyles it, `setBackdrop(id, true)` clears the override.

## Migration from v2

**`backdrop: false` moved from `open()` options to the adapter:**

```tsx
// v2
open(<MySheet />, { backdrop: false });

// v3 — in MySheet's JSX
<GorhomSheetAdapter backdrop={false}>
```

The `open()` option is gone because it duplicated per call site what is really a property of the sheet — the adapter prop declares it once and works identically in inline, portal, and persistent mode.

**`GorhomSheetAdapter` no longer accepts gorhom's `backdropComponent`.** The manager always renders the backdrop, so the two can never stack:

```tsx
// v2
<GorhomSheetAdapter backdropComponent={MyGorhomBackdrop}>

// v3 — the same rendering, but stack-aware
<GorhomSheetAdapter backdrop={{ kind: 'custom', component: MyBackdrop }}>
```

The replacement is not a like-for-like swap: a `kind: 'custom'` component receives `{ sheetId, animatedIndex, close }` instead of gorhom's `BottomSheetBackdropProps`, and it renders in the manager's backdrop layer — outside the scale transform, correctly z-indexed within the stack.
