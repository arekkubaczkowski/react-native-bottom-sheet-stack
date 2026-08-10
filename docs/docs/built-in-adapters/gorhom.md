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

**Managed by the adapter (your value is ignored or wrapped):**

| Prop | What the adapter does |
|------|----------------------|
| `index` | Set from the manager: `0` for portal and inline sheets, `-1` for a persistent sheet that is mounted but closed |
| `animatedIndex` | Replaced with the manager's shared value, which drives the backdrop and scale. A value you pass is still **mirrored** — the adapter writes every frame into it, so `animatedIndex` you own keeps working |
| `onChange` | Wrapped — reports `handleOpened()` at index `>= 0`, then calls yours |
| `onClose` | Wrapped — calls yours, then reports `handleClosed()` |
| `onAnimate` | Wrapped — reports `handleDismiss()` when animating toward `-1`, then calls yours |

**Adapter defaults (yours wins):**

| Prop | Default | Note |
|------|---------|------|
| `animationConfigs` | spring — `stiffness: 400`, `damping: 80`, `mass: 0.7` | |
| `backdropComponent` | a component returning `null` | See [Backdrop](#backdrop) |
| `enablePanDownToClose` | `true` | Forced to `false` while a [`useOnBeforeClose`](/close-interception) interceptor is blocking dismissal, so the interceptor always gets to run |

## Backdrop

By default this adapter renders gorhom's `backdropComponent` as `null` so the **stack manager's shared backdrop** (`BottomSheetBackdrop`) is used instead. This is recommended — the manager's backdrop is **stack-aware** (correct opacity across stacked sheets, z-index, scale coordination, cascading tap-to-dismiss), which a per-sheet gorhom backdrop is not.

To restyle or replace the manager's backdrop — or turn it off — pass the `backdrop` prop (`BackdropConfig | false`), which keeps all of the stack-aware behavior; see [Backdrop](/backdrop).

You **can** also override it by passing your own gorhom `backdropComponent`, but it's **not recommended** unless you specifically need gorhom's backdrop behavior. When you do, the adapter **automatically disables the manager backdrop** for that sheet so the two never stack (an explicit `backdrop` prop outranks that inference — don't pass both):

```tsx
import { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

<GorhomSheetAdapter snapPoints={['50%']} backdropComponent={GorhomBackdrop}>
  {/* ... */}
</GorhomSheetAdapter>;
```

## When to Use

- You need snap points, scrollable content, keyboard handling
- You want the most feature-rich bottom sheet experience
- Your app already uses `@gorhom/bottom-sheet`
