---
sidebar_position: 11
---

# Third-Party Adapters

These adapters wrap popular React Native bottom sheet and modal libraries. Each is an **optional peer dependency** — install only what you use.

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animationIn` | `string` | `'slideInUp'` | Show animation (any [react-native-animatable](https://github.com/oblador/react-native-animatable) animation) |
| `animationOut` | `string` | `'slideOutDown'` | Hide animation |
| `animationInTiming` | `number` | `300` | Show animation duration (ms) |
| `animationOutTiming` | `number` | `300` | Hide animation duration (ms) |
| `swipeDirection` | `string \| string[]` | `'down'` | Swipe direction(s) to dismiss |
| `swipeThreshold` | `number` | `100` | Swipe distance to trigger dismiss |
| `hasBackdrop` | `boolean` | `true` | Show backdrop overlay |
| `backdropColor` | `string` | `'black'` | Backdrop color |
| `backdropOpacity` | `number` | `0.5` | Backdrop opacity |
| `coverScreen` | `boolean` | `true` | Cover entire screen |
| `avoidKeyboard` | `boolean` | `false` | Avoid keyboard |
| `useNativeDriver` | `boolean` | `true` | Use native animation driver |
| `hideModalContentWhileAnimating` | `boolean` | `true` | Fix useNativeDriver flicker |
| `propagateSwipe` | `boolean` | — | Propagate swipe to children |
| `presentationStyle` | `string` | — | iOS presentation style |
| `statusBarTranslucent` | `boolean` | — | Android status bar |
| `modalProps` | `Record<string, unknown>` | — | Additional pass-through props |

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `detents` | `('auto' \| number)[]` | `['auto']` | Detent positions (up to 3). `'auto'` = content-sized, `0.0-1.0` = screen fraction |
| `initialDetentIndex` | `number` | `0` | Initial detent index |
| `dismissible` | `boolean` | `true` | Allow dismiss via drag/tap |
| `draggable` | `boolean` | `true` | Enable dragging |
| `dimmed` | `boolean` | `true` | Show dimmed overlay |
| `dimmedDetentIndex` | `number` | — | Detent index where dimming starts |
| `backgroundColor` | `string` | — | Sheet background color |
| `grabber` | `boolean` | `true` | Show native grabber handle |
| `cornerRadius` | `number` | — | Corner radius |
| `header` | `ReactNode` | — | Fixed header component |
| `footer` | `ReactNode` | — | Fixed footer component |
| `sheetProps` | `Record<string, unknown>` | — | Additional pass-through props |

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gestureEnabled` | `boolean` | `true` | Enable gesture controls |
| `snapPoints` | `number[]` | — | Snap points as percentages (0-100) |
| `initialSnapIndex` | `number` | — | Initial snap point index |
| `closeOnTouchBackdrop` | `boolean` | `true` | Close on backdrop tap |
| `closeOnPressBack` | `boolean` | `true` | Close on Android back button |
| `overlayColor` | `string` | — | Backdrop overlay color |
| `defaultOverlayOpacity` | `number` | `0.3` | Backdrop opacity |
| `indicatorStyle` | `object` | — | Drag indicator style |
| `containerStyle` | `object` | — | Sheet container style |
| `statusBarTranslucent` | `boolean` | — | Android status bar |
| `drawUnderStatusBar` | `boolean` | — | Draw under status bar |
| `keyboardHandlerEnabled` | `boolean` | `true` | Enable keyboard handling |
| `CustomHeaderComponent` | `ReactNode` | — | Custom header |
| `sheetProps` | `Record<string, unknown>` | — | Additional pass-through props |

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `number` | `260` | Sheet height in pixels |
| `openDuration` | `number` | `300` | Open animation duration (ms) |
| `closeDuration` | `number` | `200` | Close animation duration (ms) |
| `closeOnPressMask` | `boolean` | `true` | Close on backdrop tap |
| `closeOnPressBack` | `boolean` | `false` | Close on Android back button |
| `draggable` | `boolean` | `true` | Enable drag-to-close gesture |
| `dragOnContent` | `boolean` | `false` | Allow dragging on content (incompatible with ScrollView) |
| `useNativeDriver` | `boolean` | `true` | Use native animation driver |
| `customStyles` | `{ wrapper?, container?, draggableIcon? }` | — | Custom styles |
| `customModalProps` | `Record<string, unknown>` | — | Additional Modal props |
| `customAvoidingViewProps` | `Record<string, unknown>` | — | KeyboardAvoidingView props |

### When to Use

- You want the simplest possible sheet (~3KB)
- Fixed-height sheets are sufficient
- Zero native dependencies, minimal configuration

---

## Comparison

| Feature | ReactNativeModal | TrueSheet | ActionsSheet | RawBottomSheet |
|---------|-----------------|-----------|--------------|----------------|
| **npm downloads** | ~430K/week | ~41K/week | ~41K/week | ~25K/week |
| **Native module** | No | Yes (C++) | No | No |
| **Fabric required** | No | Yes | No | No |
| **Snap points** | No | Detents (up to 3) | Yes (%) | No (fixed height) |
| **Animations** | 60+ options | Native | Built-in | Basic slide |
| **Swipe dismiss** | Configurable | Native | Gesture-based | Drag down |
| **Bundle impact** | Medium | Small (native) | Small | Minimal (~3KB) |
