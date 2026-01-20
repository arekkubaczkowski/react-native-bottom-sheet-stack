---
sidebar_position: 1
slug: /
---

# Introduction

A stack manager for [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) with `push`, `switch`, and `replace` navigation modes, iOS-style scale animations, and React context preservation.

<div style={{textAlign: 'center', margin: '24px 0'}}>
  <video controls width="300" autoPlay loop muted playsInline>
    <source src={require('@site/static/videos/demo.mp4').default} type="video/mp4" />
  </video>
</div>

## Features

- **Stack Navigation** — `push`, `switch`, and `replace` modes for managing multiple sheets
- **Scale Animation** — iOS-style background scaling effect when sheets are stacked
- **Context Preservation** — Portal-based API that preserves React context in bottom sheets
- **Underlying Sheets Stay Mounted** — Sheets remain in the stack until explicitly closed
- **Group Support** — Isolated stacks for different parts of your app

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
  useBottomSheetState,
} from 'react-native-bottom-sheet-stack';

// 1. Define a bottom sheet component
const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetState();

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
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <Button
      title="Open Sheet"
      onPress={() => openBottomSheet(<MySheet />, { mode: 'push' })}
    />
  );
}
```
