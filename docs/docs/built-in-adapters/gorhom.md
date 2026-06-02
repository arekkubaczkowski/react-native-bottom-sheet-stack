# GorhomSheetAdapter

The default adapter. Wraps `@gorhom/bottom-sheet` to provide feature-rich bottom sheets with snap points, spring animations, and swipe gestures.

:::tip
`BottomSheetManaged` is available as a deprecated re-export from the same subpath for backward compatibility.
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

Accepts all props from [`@gorhom/bottom-sheet`](https://gorhom.dev/react-native-bottom-sheet/props). The adapter overrides `enablePanDownToClose` to `true` by default.

## Backdrop

By default this adapter renders gorhom's `backdropComponent` as `null` so the **stack manager's shared backdrop** (`BottomSheetBackdrop`) is used instead. This is recommended — the manager's backdrop is **stack-aware** (correct opacity across stacked sheets, z-index, scale coordination, cascading tap-to-dismiss), which a per-sheet gorhom backdrop is not.

You **can** override it by passing your own `backdropComponent`, but it's **not recommended** unless you specifically need gorhom's backdrop behavior. When you do, the adapter **automatically disables the manager backdrop** for that sheet so the two never stack:

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
