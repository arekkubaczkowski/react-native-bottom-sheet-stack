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

`GorhomSheetAdapterProps` extends [`BottomSheetProps`](https://gorhom.dev/react-native-bottom-sheet/props) — the full gorhom prop surface is accepted, nothing is omitted from the type. But the manager owns some of it at runtime.

It adds one prop of its own: `backdrop` (`BackdropConfig | false`) — see [Backdrop](#backdrop).

**Managed by the adapter (your value is ignored or wrapped):**

| Prop | What the adapter does |
|------|----------------------|
| `index` | Set from the manager: `0` for portal and inline sheets, `-1` for a persistent sheet that is mounted but closed |
| `animatedIndex` | Replaced with the manager's shared value, which drives the backdrop and scale. A value you pass is still **mirrored** — the adapter writes every frame into it, so `animatedIndex` you own keeps working |
| `onChange` | Wrapped — reports `handleOpened()` at index `>= 0`, then calls yours |
| `onClose` | Wrapped — calls yours, then reports `handleClosed()` |
| `onAnimate` | Wrapped — reports `handleDismiss()` when animating toward `-1`, then calls yours |
| `backdropComponent` | **Deprecated.** Still forwarded, and passing it suppresses the manager's shared backdrop so the two never stack. Use `backdrop` instead — see [Backdrop](#backdrop) and [Deprecations](/backdrop#deprecations) |

**Adapter defaults (yours wins):**

| Prop | Default | Note |
|------|---------|------|
| `animationConfigs` | spring — `stiffness: 400`, `damping: 80`, `mass: 0.7` | |
| `enablePanDownToClose` | `true` | Forced to `false` while a [`useOnBeforeClose`](/close-interception) interceptor is blocking dismissal, so the interceptor always gets to run |

## Backdrop

By default the **stack manager's shared backdrop** (`BottomSheetBackdrop`) is the one rendered: gorhom's `backdropComponent` defaults to a component returning `null`. Only the manager's backdrop is **stack-aware** (correct opacity across stacked sheets, z-index, scale coordination, cascading tap-to-dismiss).

Passing a gorhom `backdropComponent` is **deprecated**: it renders inside the sheet, so the adapter suppresses the manager's to avoid stacking two overlays — and you lose the stack-aware behaviour. Use `backdrop={{ kind: 'custom', component }}` instead.

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
