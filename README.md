# react-native-bottom-sheet-stack

A stack manager for [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) with navigation modes, iOS-style scale animations, and React context preservation.

## 📚 Documentation

**[View Full Documentation](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/)**

- [Getting Started](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/getting-started)
- [Navigation Modes](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/navigation-modes)
- [Scale Animation](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/scale-animation)
- [Portal API (Context Preservation)](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/context-preservation)
- [Persistent Sheets](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/persistent-sheets)
- [Type-Safe IDs & Params](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/type-safe-ids)
- [API Reference](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/api/components)

## ✨ Features

- 📚 **Stack Navigation** - `push`, `switch`, and `replace` modes for managing multiple sheets
- 🎭 **Scale Animation** - iOS-style background scaling effect when sheets are stacked
- 🔗 **Context Preservation** - Portal-based API that preserves React context in bottom sheets
- ⚡ **Persistent Sheets** - Pre-mounted sheets that open instantly and preserve state
- 🔒 **Type-Safe** - Full TypeScript support with type-safe portal IDs and params
- 📦 **Group Support** - Isolated stacks for different parts of your app

## Installation

```bash
yarn add react-native-bottom-sheet-stack
```

### Peer Dependencies

```bash
yarn add @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-teleport zustand
```

## Quick Example

```tsx
import {
  BottomSheetManagerProvider,
  BottomSheetHost,
  BottomSheetScaleView,
  BottomSheetManaged,
  useBottomSheetManager,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

// 1. Setup
function App() {
  return (
    <BottomSheetManagerProvider id="main">
      <BottomSheetScaleView>
        <MyApp />
      </BottomSheetScaleView>
      <BottomSheetHost />
    </BottomSheetManagerProvider>
  );
}

// 2. Create a sheet
const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();
  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <Text>Hello!</Text>
      <Button title="Close" onPress={close} />
    </BottomSheetManaged>
  );
});

// 3. Open it
function OpenButton() {
  const { open } = useBottomSheetManager();
  return (
    <Button
      title="Open"
      onPress={() => open(<MySheet />, { scaleBackground: true })}
    />
  );
}
```

## License

MIT
