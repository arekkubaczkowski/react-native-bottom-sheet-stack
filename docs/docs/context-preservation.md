---
sidebar_position: 5
---

# Context Preservation (Portal API)

The imperative `openBottomSheet()` API stores content in a Zustand store and renders it in `BottomSheetHost`. This means **React context from your component tree is lost**.

For cases where you need context (themes, auth, i18n, etc.), use the **portal-based API**.

## Portal API

```tsx
import {
  BottomSheetPortal,
  useBottomSheetControl,
} from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { open, close, isOpen } = useBottomSheetControl('my-sheet');

  return (
    <View>
      {/* Declare the portal - content is rendered here in your React tree */}
      <BottomSheetPortal id="my-sheet">
        <MySheet />
      </BottomSheetPortal>

      {/* Control it imperatively */}
      <Button title="Open" onPress={() => open({ scaleBackground: true })} />
    </View>
  );
}
```

## How It Works

| API | Context | Use Case |
|-----|---------|----------|
| `openBottomSheet()` | Lost | Dynamic sheets, simple cases |
| `BottomSheetPortal` | Preserved | Sheets needing theme, auth, i18n, etc. |

The portal API uses [react-native-teleport](https://github.com/nicklockwood/react-native-teleport) to render content in your component tree while displaying it in `BottomSheetHost`.

## Example: Theme Context

```tsx
import { useTheme } from './ThemeContext';

// This sheet needs access to ThemeContext
const ThemedSheet = forwardRef((props, ref) => {
  const { colors } = useTheme(); // Works with Portal API!

  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <BottomSheetView style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Themed Content</Text>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

function App() {
  const { open } = useBottomSheetControl('themed-sheet');

  return (
    <ThemeProvider>
      <BottomSheetPortal id="themed-sheet">
        <ThemedSheet />
      </BottomSheetPortal>

      <Button title="Open Themed Sheet" onPress={() => open()} />
    </ThemeProvider>
  );
}
```

## When to Use Each API

### Use `openBottomSheet()` when:
- Sheet content is simple and doesn't need context
- You're generating sheets dynamically from data
- You want quick, one-off sheets

### Use `BottomSheetPortal` when:
- Sheet needs access to React context (theme, auth, i18n)
- Sheet is pre-defined in your component tree
- You need to pass props from parent component
