# react-native-bottom-sheet-stack

A stack manager for bottom sheets and modals in React Native. Supports `push`, `switch`, and `replace` navigation modes, iOS-style scale animations, and React context preservation. Works with any bottom sheet or modal library via a pluggable adapter architecture.

## Documentation

**[View Full Documentation](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/)**

- [Getting Started](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/getting-started)
- [Imperative vs Portal API](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/api-comparison)
- [Navigation Modes](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/navigation-modes)
- [Scale Animation](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/scale-animation)
- [Portal API (Context Preservation)](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/context-preservation)
- [Persistent Sheets](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/persistent-sheets)
- [Type-Safe IDs & Params](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/type-safe-ids)
- [Adapters](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/adapters) / [Shipped Adapters](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/built-in-adapters) / [Custom Adapters](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/custom-adapters)
- [API Reference](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/api/components)

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
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';

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

| Adapter | Import | Wraps | Extra Peer Dependencies |
|---------|--------|-------|-----------------------|
| `GorhomSheetAdapter` | `react-native-bottom-sheet-stack/gorhom` | `@gorhom/bottom-sheet` | `@gorhom/bottom-sheet`, `react-native-gesture-handler` |
| `CustomModalAdapter` | `react-native-bottom-sheet-stack` | Custom animated modal | None |
| `ReactNativeModalAdapter` | `react-native-bottom-sheet-stack/react-native-modal` | `react-native-modal` | `react-native-modal` |
| `ActionsSheetAdapter` | `react-native-bottom-sheet-stack/actions-sheet` | `react-native-actions-sheet` | `react-native-actions-sheet` |

Adapters with 3rd-party dependencies are shipped as separate subpath exports so that importing the main package never triggers Metro resolution errors for uninstalled libraries. Each sheet in the stack can use a different adapter.

## License

MIT
