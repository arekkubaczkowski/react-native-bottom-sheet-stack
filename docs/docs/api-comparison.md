---
sidebar_position: 3
---

# Imperative vs Portal API

This library provides two approaches for working with bottom sheets. Both are equally capable - choose based on your preferences and use case.

## Overview

| | Imperative API | Portal API |
|---|----------------|------------|
| **Style** | Fully imperative | Declarative definition, imperative control |
| **Hook** | `useBottomSheetManager` | `useBottomSheetControl` |
| **Open** | `openBottomSheet(<Component />)` | `open()` |
| **React Context** | From `BottomSheetHost` location | From definition site |
| **Sheet definition** | At the call site | Anywhere in the component tree |

## Imperative API

Open sheets directly by passing JSX:

```tsx
import { useBottomSheetManager } from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { openBottomSheet } = useBottomSheetManager();

  const handleOpen = () => {
    openBottomSheet(<MySheet />, {
      mode: 'push',
      scaleBackground: true,
    });
  };

  return <Button title="Open" onPress={handleOpen} />;
}
```

**Characteristics:**
- Sheet content is passed directly to `openBottomSheet()`
- Content is stored in Zustand and rendered in `BottomSheetHost`
- Sheets have access to context that wraps `BottomSheetHost`, not the call site

:::tip Context with Imperative API
If you need context access with Imperative API, wrap `BottomSheetHost` with your providers:

```tsx
<ThemeProvider>
  <AuthProvider>
    <BottomSheetHost /> {/* Sheets rendered here have access to Theme and Auth */}
  </AuthProvider>
</ThemeProvider>
```

Sheets will have access to these contexts, but not to context from where `openBottomSheet()` is called.
:::

## Portal API

Declare sheets in your component tree, control them by ID:

```tsx
import {
  BottomSheetPortal,
  useBottomSheetControl,
} from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { open } = useBottomSheetControl('my-sheet');

  return (
    <View>
      <BottomSheetPortal id="my-sheet">
        <MySheet />
      </BottomSheetPortal>

      <Button title="Open" onPress={() => open({ scaleBackground: true })} />
    </View>
  );
}
```

**Characteristics:**
- Sheet is declared as JSX in your component tree
- Content stays in your React tree (via [react-native-teleport](https://github.com/nicklockwood/react-native-teleport))
- React context (theme, auth, i18n, navigation) is preserved
- Can define sheet in one place and open from anywhere within the same provider

## When to Choose

### Imperative API

- You prefer a fully imperative, inline approach
- Context preservation is not needed
- You want to define sheets dynamically at the call site

### Portal API

- You need React context inside the sheet (theme, auth, i18n, navigation)
- You want to define a sheet once and open it from multiple places
- You prefer declarative sheet definitions in JSX

## Both APIs Support

- All navigation modes (`push`, `switch`, `replace`)
- Scale animation (`scaleBackground: true`)
- Stacking multiple sheets
- Type-safe params
