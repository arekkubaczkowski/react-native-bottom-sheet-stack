---
sidebar_position: 6
---

# Backdrop

Every sheet gets a shared, stack-aware backdrop rendered by the manager: it sits outside the scale transform, layers correctly under its own sheet and above the one beneath, fades with the sheet's live `animatedIndex`, and closes the sheet on tap through the `onBeforeClose` interceptor path.

By default it is a `rgba(0, 0, 0, 0.5)` scrim. Two levels make it configurable — the sheet's choice wins over the group's:

1. **Group default** — `backdrop` on `BottomSheetManagerProvider`
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
  backdrop={{ kind: 'styled', style: { backgroundColor: 'rgba(0, 0, 0, 0.75)' } }}
>
  ...
</BottomSheetManagerProvider>
```

`backdrop={false}` on the provider gives the whole group no backdrop. It is the
same prop name and type as on the adapters — one is the default, the other the
override.

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

`backdrop={false}` also removes the layer that blocks touches: taps outside the
sheet then reach whatever is behind it. `pressToDismiss: false` keeps that shield
and only stops the tap from closing the sheet.

Resolution is per field for `pressToDismiss`, and **atomic for the visual choice**: a sheet-level config replaces the group's rendering entirely (a group `custom` component never bleeds under a sheet that asked for `styled`). When both levels are `styled`, their styles compose — group over default, sheet over group.

## Custom component (blur, gradients)

`kind: 'custom'` replaces the rendered backdrop with your own component — the common case is a blur:

```tsx
import { StyleSheet } from 'react-native';
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

```

```tsx
<GorhomSheetAdapter backdrop={{ kind: 'custom', component: BlurBackdrop }}>
```

:::warning Define the component at module scope
The component is compared by identity. An inline arrow (`component: (p) => <Blur {...p} />`)
is a new type on every render, which remounts the backdrop and restarts whatever it animates.
:::

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
import {
  useAdapterBackdrop,
  useBottomSheetContext,
  type BackdropConfig,
} from 'react-native-bottom-sheet-stack';

function MyAdapter({ backdrop, ...props }: { backdrop?: BackdropConfig | false }) {
  const { id } = useBottomSheetContext();
  useAdapterBackdrop(id, backdrop);
  // ...
}
```

`useSetBackdrop` is the imperative escape hatch for what the prop cannot express: `setBackdrop(id, false)` suppresses the shared backdrop (for an adapter that draws its own overlay), `setBackdrop(id, config)` restyles or replaces it, and `setBackdrop(id, true)` **clears** the override so the sheet falls back to the group default.

## Deprecations

Both of these still work. They are deprecated rather than removed, so upgrading
needs no code changes — but each emits a dev-mode warning and goes away in the
next major.

**`backdrop: boolean` on `open()` → the adapter's `backdrop` prop.**

```tsx
// deprecated
open(<MySheet />, { backdrop: false });

// preferred — in MySheet's JSX
<GorhomSheetAdapter backdrop={false}>
```

The adapter prop declares the backdrop once, next to the sheet's other visual
props, and works identically in inline, portal and persistent mode. It also
expresses more than on/off: the `open()` option can only disable the backdrop,
never restyle or replace it.

The one thing the option could do that the prop cannot is vary the backdrop
**per open** — the same sheet opening with a scrim from one flow and without one
from another. Drive that from `params` instead:

```tsx
function MySheet() {
  const { params } = useBottomSheetContext<'filters'>();
  return <GorhomSheetAdapter backdrop={params?.bare ? false : undefined}>{/* … */}</GorhomSheetAdapter>;
}

open({ params: { bare: true } });
```

An adapter that declares its own `backdrop` prop overrides the option, since it
is the more specific declaration.

**`backdropComponent` on `GorhomSheetAdapter` → `backdrop={{ kind: 'custom' }}`.**

```tsx
// deprecated — renders inside the sheet, suppresses the manager's backdrop
<GorhomSheetAdapter backdropComponent={MyGorhomBackdrop}>

// preferred — the same rendering, in the manager's stack-aware layer
<GorhomSheetAdapter backdrop={{ kind: 'custom', component: MyBackdrop }}>
```

Not a like-for-like swap: a `kind: 'custom'` component receives
`{ sheetId, animatedIndex, close }` rather than gorhom's
`BottomSheetBackdropProps`, and it renders outside the scale transform,
correctly z-indexed within the stack. Passing both is a mistake — the `backdrop`
prop wins and the two overlays stack.
