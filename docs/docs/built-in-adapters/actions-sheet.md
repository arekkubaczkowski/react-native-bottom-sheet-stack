# ActionsSheetAdapter

Wraps [`react-native-actions-sheet`](https://github.com/ammarahm-ed/react-native-actions-sheet) — a zero-dependency action sheet with snap points, gestures, and a SheetManager API.

## Installation

```bash
npm install react-native-actions-sheet
```

## Usage

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

## Props

All [`react-native-actions-sheet` props](https://github.com/ammarahm-ed/react-native-actions-sheet#actionsheet-props) are accepted via spread.

Adapter defaults (overridable): `gestureEnabled`, `closeOnTouchBackdrop`, `closeOnPressBack`, `keyboardHandlerEnabled`.

:::tip
This adapter uses `isModal={false}` internally to avoid wrapping in a redundant Modal — the stack manager handles the overlay lifecycle.
:::
