# react-native-bottom-sheet-stack

A **library-agnostic** stack manager for bottom sheets and modals in React Native. Supports `push`, `switch`, and `replace` navigation modes, iOS-style scale animations, and React context preservation. Works with any bottom sheet or modal library via pluggable [adapters](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/adapters).

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

- **Library-Agnostic** - Pluggable [adapter architecture](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/adapters) works with any bottom sheet or modal library
- **Stack Navigation** - `push`, `switch`, and `replace` modes for managing multiple sheets
- **Scale Animation** - iOS-style background scaling effect when sheets are stacked
- **Context Preservation** - Portal-based API that preserves React context in bottom sheets
- **Mixed Stacking** - Bottom sheets and modals coexist in the same stack
- **Persistent Sheets** - Pre-mounted sheets that open instantly and preserve state
- **Type-Safe** - Full TypeScript support with type-safe portal IDs and params
- **Group Support** - Isolated stacks for different parts of your app

## Shipped Adapters

| Adapter | Wraps | Extra Dependencies |
|---------|-------|--------------------|
| `GorhomSheetAdapter` | `@gorhom/bottom-sheet` | `@gorhom/bottom-sheet`, `react-native-gesture-handler` |
| `CustomModalAdapter` | Custom React Native UI | None |
| `ReactNativeModalAdapter` | `react-native-modal` | `react-native-modal` |
| `ActionsSheetAdapter` | `react-native-actions-sheet` | `react-native-actions-sheet` |

Each sheet can use a different adapter. You can also [build your own](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/custom-adapters).

## Installation

```bash
yarn add react-native-bottom-sheet-stack
```

### Core Peer Dependencies

```bash
yarn add react-native-reanimated react-native-safe-area-context react-native-teleport zustand
```

### Adapter-Specific Dependencies

Install only the dependencies for the adapter(s) you plan to use:

```bash
# For GorhomSheetAdapter (default bottom sheet adapter)
yarn add @gorhom/bottom-sheet react-native-gesture-handler

# For ModalAdapter — no extra dependencies (uses React Native's built-in Modal)

# For ReactNativeModalAdapter
yarn add react-native-modal

# For ActionsSheetAdapter
yarn add react-native-actions-sheet
```

## Quick Example

```tsx
import { forwardRef } from 'react';
import { View, Text, Button } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  BottomSheetManagerProvider,
  BottomSheetHost,
  BottomSheetScaleView,
  BottomSheetManaged,
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

// 1. Define a bottom sheet component
const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <BottomSheetView>
        <View style={{ padding: 20 }}>
          <Text>Hello from Bottom Sheet!</Text>
          <Button title="Close" onPress={close} />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
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

// 3. Open bottom sheets
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

> `BottomSheetManaged` is a re-export of `GorhomSheetAdapter`. You can use any [shipped adapter](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/built-in-adapters) or [build your own](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/custom-adapters).

## License

MIT
