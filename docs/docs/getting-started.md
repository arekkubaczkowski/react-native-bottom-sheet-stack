---
sidebar_position: 2
---

# Getting Started

## Installation

```bash
yarn add react-native-bottom-sheet-stack
```

### Peer Dependencies

```bash
yarn add @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-teleport zustand
```

## Setup

### 1. Setup Provider and Host

Wrap your app with `BottomSheetManagerProvider` and add `BottomSheetHost`:

```tsx
import {
  BottomSheetManagerProvider,
  BottomSheetHost,
  BottomSheetScaleView,
} from 'react-native-bottom-sheet-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetManagerProvider id="default">
          <BottomSheetScaleView>
            <YourAppContent />
          </BottomSheetScaleView>
          <BottomSheetHost />
        </BottomSheetManagerProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
```

:::warning Important
`BottomSheetHost` must be **outside** of `BottomSheetScaleView`. If you wrap `BottomSheetHost` inside `BottomSheetScaleView`, the bottom sheets themselves will also scale, which is not the desired behavior.
:::

### 2. Create a Bottom Sheet Component

Use `BottomSheetManaged` instead of `BottomSheet` from `@gorhom/bottom-sheet`:

```tsx
import { forwardRef } from 'react';
import { View, Text, Button } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  BottomSheetManaged,
  useBottomSheetContext,
} from 'react-native-bottom-sheet-stack';

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
```

### 3. Open Bottom Sheets

```tsx
import { useBottomSheetManager } from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { open } = useBottomSheetManager();

  const handleOpen = () => {
    open(<MySheet />, {
      mode: 'push', // 'push' | 'switch' | 'replace'
      scaleBackground: true,
    });
  };

  return <Button title="Open Sheet" onPress={handleOpen} />;
}
```
