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

### When to Use

- You need rich, customizable animations (bounce, zoom, rotate, etc.)
- Swipe-to-dismiss with configurable direction and threshold
- Custom backdrop styling

---

## TrueSheetAdapter

Wraps [`@lodev09/react-native-true-sheet`](https://github.com/lodev09/react-native-true-sheet) — a fully native C++/Fabric bottom sheet with the best performance characteristics.

### Installation

```bash
npm install @lodev09/react-native-true-sheet
cd ios && pod install
```

:::warning
Requires React Native **New Architecture (Fabric)**. Won't work with the old architecture.
:::

### Usage

```tsx
import { TrueSheetAdapter } from 'react-native-bottom-sheet-stack';

function NativeSheet() {
  const { close } = useBottomSheetContext();

  return (
    <TrueSheetAdapter detents={['auto', 0.6]} grabber cornerRadius={20}>
      <View style={{ padding: 20 }}>
        <Text>Native C++ sheet</Text>
        <Button title="Close" onPress={close} />
      </View>
    </TrueSheetAdapter>
  );
}
```

### Props

All [`@lodev09/react-native-true-sheet` props](https://github.com/lodev09/react-native-true-sheet#props) are accepted via spread.

Adapter defaults (overridable): `detents={['auto']}`, `grabber`, `dismissible`, `draggable`, `dimmed`.

### When to Use

- You need maximum performance (native C++ implementation)
- Your app uses React Native New Architecture (Fabric)
- You want platform-native look and feel (native grabber, detents)

---

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

### When to Use

- You want zero native dependencies
- Snap point-based sizing (percentages)
- You need a lightweight sheet with gesture support

---

## RawBottomSheetAdapter

Wraps [`react-native-raw-bottom-sheet`](https://github.com/nicoleho0707/react-native-raw-bottom-sheet) — the simplest, most lightweight bottom sheet available.

### Installation

```bash
npm install react-native-raw-bottom-sheet
```

### Usage

```tsx
import { RawBottomSheetAdapter } from 'react-native-bottom-sheet-stack';

function SimpleSheet() {
  const { close } = useBottomSheetContext();

  return (
    <RawBottomSheetAdapter
      height={350}
      draggable
      customStyles={{
        container: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
      }}
    >
      <View style={{ padding: 20 }}>
        <Text>Simple bottom sheet</Text>
        <Button title="Close" onPress={close} />
      </View>
    </RawBottomSheetAdapter>
  );
}
```

### Props

All [`react-native-raw-bottom-sheet` props](https://github.com/nicoleho0707/react-native-raw-bottom-sheet#props) are accepted via spread.

Adapter defaults (overridable): `height={260}`, `draggable`, `closeOnPressMask`, `useNativeDriver`.

### When to Use

- You want the simplest possible sheet (~3KB)
- Fixed-height sheets are sufficient
- Zero native dependencies, minimal configuration

---

## Comparison

| Feature | ReactNativeModal | TrueSheet | ActionsSheet | RawBottomSheet |
|---------|-----------------|-----------|--------------|----------------|
| **Native module** | No | Yes (C++) | No | No |
| **Fabric required** | No | Yes | No | No |
| **Snap points** | No | Detents (up to 3) | Yes (%) | No (fixed height) |
| **Animations** | 60+ options | Native | Built-in | Basic slide |
| **Swipe dismiss** | Configurable | Native | Gesture-based | Drag down |
| **Bundle impact** | Medium | Small (native) | Small | Minimal (~3KB) |
