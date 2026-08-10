# GorhomSheetAdapter

The default adapter. Wraps `@gorhom/bottom-sheet` to provide feature-rich bottom sheets with snap points, spring animations, and swipe gestures.

:::tip
`@gorhom/bottom-sheet` is an optional peer dependency — install it only if you
use this adapter. It is imported from the `/gorhom` subpath, never from the
main entry point.
:::

## Installation

```bash
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
```

## Usage

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';
import { BottomSheetView } from '@gorhom/bottom-sheet';

const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <GorhomSheetAdapter ref={ref} snapPoints={['50%', '90%']}>
      <BottomSheetView>
        <Text>Sheet content</Text>
        <Button title="Close" onPress={close} />
      </BottomSheetView>
    </GorhomSheetAdapter>
  );
});
```

## Props

`GorhomSheetAdapterProps` extends [`BottomSheetProps`](https://gorhom.dev/react-native-bottom-sheet/props) — the full gorhom prop surface is accepted except `backdropComponent`, which the manager owns. Some other props are owned at runtime.

It adds one prop of its own: `backdrop` (`BackdropConfig | false`) — see [Backdrop](#backdrop).

**Managed by the adapter (your value is ignored or wrapped):**

| Prop | What the adapter does |
|------|----------------------|
| `index` | Set from the manager: `0` for portal and inline sheets, `-1` for a persistent sheet that is mounted but closed |
| `animatedIndex` | Replaced with the manager's shared value, which drives the backdrop and scale. A value you pass is still **mirrored** — the adapter writes every frame into it, so `animatedIndex` you own keeps working |
| `onChange` | Wrapped — reports `handleOpened()` at index `>= 0`, then calls yours |
| `onClose` | Wrapped — calls yours, then reports `handleClosed()` |
| `onAnimate` | Wrapped — reports `handleDismiss()` when animating toward `-1`, then calls yours |
| `backdropComponent` | Forced to render nothing — the manager draws the backdrop. Not accepted by the type; use `backdrop` instead. See [Backdrop](#backdrop) |

**Adapter defaults (yours wins):**

| Prop | Default | Note |
|------|---------|------|
| `animationConfigs` | spring — `stiffness: 400`, `damping: 80`, `mass: 0.7` | |
| `enablePanDownToClose` | `true` | Forced to `false` while a [`useOnBeforeClose`](/close-interception) interceptor is blocking dismissal, so the interceptor always gets to run |

## Backdrop

The **stack manager's shared backdrop** (`BottomSheetBackdrop`) is always the one rendered: gorhom's own `backdropComponent` is forced to render nothing, and is not part of `GorhomSheetAdapterProps`. Two overlays would otherwise stack into a double-dark layer, and only the manager's is **stack-aware** (correct opacity across stacked sheets, z-index, scale coordination, cascading tap-to-dismiss).

Configure it with the `backdrop` prop — restyle it, replace it with your own component (blur, gradients), or turn it off entirely, all without losing that stack-aware behavior:

```tsx
// Restyle
<GorhomSheetAdapter snapPoints={['50%']} backdrop={{ kind: 'styled', style: { backgroundColor: 'rgba(0,0,0,0.8)' } }}>

// Replace (receives the sheet's live animatedIndex)
<GorhomSheetAdapter snapPoints={['50%']} backdrop={{ kind: 'custom', component: BlurBackdrop }}>

// None
<GorhomSheetAdapter snapPoints={['50%']} backdrop={false}>
```

See [Backdrop](/backdrop) for the full API.

## When to Use

- You need snap points, scrollable content, keyboard handling
- You want the most feature-rich bottom sheet experience
- Your app already uses `@gorhom/bottom-sheet`
