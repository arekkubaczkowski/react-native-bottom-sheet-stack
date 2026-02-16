---
sidebar_position: 11
---

# Third-Party Adapters

These adapters wrap popular React Native bottom sheet and modal libraries. Each is an **optional peer dependency** — install only what you use.

All library-specific props are accepted via spread and forwarded to the underlying component. Each adapter sets sensible defaults that can be overridden.

## ReactNativeModalAdapter

Wraps [`react-native-modal`](https://github.com/react-native-modal/react-native-modal) — a feature-rich modal with 60+ animation options, swipe-to-dismiss, and customizable backdrops.

### Installation

```bash
npm install react-native-modal
```

### Usage

```tsx
import { ReactNativeModalAdapter } from 'react-native-bottom-sheet-stack';

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

## ActionsSheetAdapter

Wraps [`react-native-actions-sheet`](https://github.com/ammarahm-ed/react-native-actions-sheet) — a zero-dependency action sheet with snap points, gestures, and a SheetManager API.

### Installation

```bash
npm install react-native-actions-sheet
```

### Usage

```tsx
import { ActionsSheetAdapter } from 'react-native-bottom-sheet-stack';

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


