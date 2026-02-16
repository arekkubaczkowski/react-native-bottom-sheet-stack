---
sidebar_position: 10
---

# Shipped Adapters

All adapters listed below ship with the library. `CustomModalAdapter` requires no additional dependencies. The others wrap optional peer dependencies — install only what you use.

## GorhomSheetAdapter

The default adapter. Wraps `@gorhom/bottom-sheet` to provide feature-rich bottom sheets with snap points, spring animations, and swipe gestures.

:::tip
`BottomSheetManaged` is available as a deprecated re-export from the same subpath for backward compatibility.
:::

### Installation

```bash
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
```

### Usage

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

### Props

Accepts all props from [`@gorhom/bottom-sheet`](https://gorhom.dev/react-native-bottom-sheet/props). The adapter overrides `enablePanDownToClose` to `true` by default.

### When to Use

- You need snap points, scrollable content, keyboard handling
- You want the most feature-rich bottom sheet experience
- Your app already uses `@gorhom/bottom-sheet`

---

## CustomModalAdapter

Custom React Native dialog UI. No additional dependencies needed.

### Usage

```tsx
import { CustomModalAdapter, useBottomSheetContext } from 'react-native-bottom-sheet-stack';

function MyModal() {
  const { close } = useBottomSheetContext();

  return (
    <CustomModalAdapter>
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Modal content</Text>
        <Button title="Close" onPress={close} />
      </View>
    </CustomModalAdapter>
  );
}
```

### Props

Accepts `contentContainerStyle` for the inner wrapper view.

### Mixed Stacking

Modals and bottom sheets can coexist in the same stack:

```tsx
const { open } = useBottomSheetManager();
const modalControl = useBottomSheetControl('my-modal');

// Push a bottom sheet
open(<MyBottomSheet />, { mode: 'push' });

// Then push a modal on top
modalControl.open({ mode: 'push' });
// Both are in the stack — closing the modal returns to the bottom sheet
```

---

## ReactNativeModalAdapter

Wraps [`react-native-modal`](https://github.com/react-native-modal/react-native-modal) — a feature-rich modal with 60+ animation options, swipe-to-dismiss, and customizable backdrops.

### Installation

```bash
npm install react-native-modal
```

### Usage

```tsx
import { ReactNativeModalAdapter } from 'react-native-bottom-sheet-stack/react-native-modal';

function FancyModal() {
  const { close } = useBottomSheetContext();

  return (
    <ReactNativeModalAdapter
      animationIn="slideInUp"
      animationOut="slideOutDown"
      swipeDirection="down"
      backdropOpacity={0.6}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Fancy animated modal</Text>
        <Button title="Close" onPress={close} />
      </View>
    </ReactNativeModalAdapter>
  );
}
```

### Props

All [`react-native-modal` props](https://github.com/react-native-modal/react-native-modal#available-props) are accepted via spread.

Adapter defaults (overridable): `swipeDirection="down"`, `backdropOpacity={0.5}`, `useNativeDriver`, `hideModalContentWhileAnimating`.

---

## ActionsSheetAdapter

Wraps [`react-native-actions-sheet`](https://github.com/ammarahm-ed/react-native-actions-sheet) — a zero-dependency action sheet with snap points, gestures, and a SheetManager API.

### Installation

```bash
npm install react-native-actions-sheet
```

### Usage

```tsx
import { ActionsSheetAdapter } from 'react-native-bottom-sheet-stack/actions-sheet';

function MyActionsSheet() {
  const { close } = useBottomSheetContext();

  return (
    <ActionsSheetAdapter snapPoints={[50, 100]} gestureEnabled>
      <View style={{ padding: 20 }}>
        <Text>Actions sheet with snap points</Text>
        <Button title="Close" onPress={close} />
      </View>
    </ActionsSheetAdapter>
  );
}
```

### Props

All [`react-native-actions-sheet` props](https://github.com/ammarahm-ed/react-native-actions-sheet#actionsheet-props) are accepted via spread.

Adapter defaults (overridable): `gestureEnabled`, `closeOnTouchBackdrop`, `closeOnPressBack`, `keyboardHandlerEnabled`.

:::tip
This adapter uses `isModal={false}` internally to avoid wrapping in a redundant Modal — the stack manager handles the overlay lifecycle.
:::
