# react-native-bottom-sheet-stack

A stack manager for bottom sheets and modals in React Native. Supports `push`, `switch`, and `replace` navigation modes, iOS-style scale animations, and React context preservation. Works with any bottom sheet or modal library via a pluggable adapter architecture.

## Features

- **Adapter Architecture** - Pluggable adapters for different bottom sheet/modal libraries. Ships with adapters for `@gorhom/bottom-sheet`, `react-native-modal`, `react-native-actions-sheet`, and a custom modal. You can also build your own.
- **Stack Navigation** - `push`, `switch`, and `replace` modes for managing multiple sheets
- **Scale Animation** - iOS-style background scaling effect when sheets are stacked
- **Context Preservation** - Portal-based API that preserves React context in bottom sheets
- **Mixed Stacking** - Bottom sheets and modals coexist in the same stack
- **Persistent Sheets** - Pre-mounted sheets that open instantly and preserve state
- **Type-Safe** - Full TypeScript support with type-safe portal IDs and params
- **Group Support** - Isolated stacks for different parts of your app

## Installation

```bash
yarn add react-native-bottom-sheet-stack
```

### Peer Dependencies

```bash
yarn add react-native-reanimated react-native-safe-area-context react-native-teleport react-native-worklets zustand
```

Additionally, install the dependencies required by the adapter(s) you plan to use (e.g. `@gorhom/bottom-sheet` and `react-native-gesture-handler` for `GorhomSheetAdapter`).

## Quick Example (with `@gorhom/bottom-sheet`)

```tsx
import { forwardRef } from 'react';
import { View, Text, Button } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  BottomSheetManagerProvider,
  BottomSheetHost,
  BottomSheetScaleView,
  GorhomSheetAdapter,
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

// 1. Define a bottom sheet component
const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <GorhomSheetAdapter ref={ref} snapPoints={['50%']}>
      <BottomSheetView>
        <View style={{ padding: 20 }}>
          <Text>Hello from Bottom Sheet!</Text>
          <Button title="Close" onPress={close} />
        </View>
      </BottomSheetView>
    </GorhomSheetAdapter>
  );
});

// 2. Setup provider and host
function App() {
  return (
    <BottomSheetManagerProvider id="default">
      <BottomSheetScaleView>
        <YourAppContent />
      </BottomSheetScaleView>
      <BottomSheetHost />
    </BottomSheetManagerProvider>
  );
}

// 3. Open bottom sheets from anywhere
function YourAppContent() {
  const { open } = useBottomSheetManager();

  return (
    <Button
      title="Open Sheet"
      onPress={() => open(<MySheet />, { mode: 'push' })}
    />
  );
}
```

## Shipped Adapters

| Adapter | Wraps | Extra Peer Dependencies |
|---------|-------|-----------------------|
| `GorhomSheetAdapter` | `@gorhom/bottom-sheet` | `@gorhom/bottom-sheet`, `react-native-gesture-handler` |
| `CustomModalAdapter` | Custom animated modal | None |
| `ReactNativeModalAdapter` | `react-native-modal` | `react-native-modal` |
| `ActionsSheetAdapter` | `react-native-actions-sheet` | `react-native-actions-sheet` |

Each sheet in the stack can use a different adapter.

## License

MIT
