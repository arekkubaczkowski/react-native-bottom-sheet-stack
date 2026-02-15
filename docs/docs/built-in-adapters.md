---
sidebar_position: 10
---

# Built-in Adapters

These adapters ship with the library and require no additional dependencies beyond the core peer dependencies.

## GorhomSheetAdapter

The default adapter. Wraps `@gorhom/bottom-sheet` to provide feature-rich bottom sheets with snap points, spring animations, and swipe gestures.

:::tip
`BottomSheetManaged` is a re-export of `GorhomSheetAdapter` for backward compatibility. They are identical.
:::

### Usage

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack';
import { BottomSheetView } from '@gorhom/bottom-sheet';

const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();

  return (
    <GorhomSheetAdapter ref={ref} snapPoints={['50%', '90%']}>
      <BottomSheetView>
        <Text>Sheet content</Text>
        <Button title="Close" onPress={close} />
      </BottomSheetView>
    </GorhomSheetAdapter>
  );
});
```

### Props

Accepts all props from [`@gorhom/bottom-sheet`](https://gorhom.dev/react-native-bottom-sheet/props).

Key props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `snapPoints` | `(string \| number)[]` | — | Snap point positions |
| `enableDynamicSizing` | `boolean` | `false` | Auto-size to content |
| `enablePanDownToClose` | `boolean` | `true` | Swipe down to dismiss |
| `backdropComponent` | `Component` | `null` | Custom backdrop |

### When to Use

- You need snap points, scrollable content, keyboard handling
- You want the most feature-rich bottom sheet experience
- Your app already uses `@gorhom/bottom-sheet`

---

## ModalAdapter

Wraps React Native's built-in `Modal` component. No additional dependencies needed.

### Usage

```tsx
import { ModalAdapter, useBottomSheetContext } from 'react-native-bottom-sheet-stack';

function MyModal() {
  const { close } = useBottomSheetContext();

  return (
    <ModalAdapter animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Modal content</Text>
        <Button title="Close" onPress={close} />
      </View>
    </ModalAdapter>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animationType` | `'none' \| 'slide' \| 'fade'` | `'slide'` | Animation type |
| `presentationStyle` | `'fullScreen' \| 'pageSheet' \| 'formSheet' \| 'overFullScreen'` | `'pageSheet'` | iOS presentation style |
| `transparent` | `boolean` | `false` | Transparent background |
| `statusBarTranslucent` | `boolean` | — | Android status bar |
| `contentContainerStyle` | `ViewStyle` | — | Inner container style |

### When to Use

- Full-screen overlays or alerts
- iOS page sheet presentation
- When you don't need snap points or gestures
- Zero additional dependencies

### Example: Page Sheet with Navigation

```tsx
<BottomSheetPortal id="settings-modal">
  <SettingsModal />
</BottomSheetPortal>

function SettingsModal() {
  const { close } = useBottomSheetContext();

  return (
    <ModalAdapter animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1 }}>
        <Header title="Settings" onClose={close} />
        <SettingsForm />
      </SafeAreaView>
    </ModalAdapter>
  );
}
```

### Example: Transparent Overlay

```tsx
<ModalAdapter animationType="fade" transparent presentationStyle="overFullScreen">
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
    <View style={{ margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 12 }}>
      <Text>Are you sure?</Text>
      <Button title="Confirm" onPress={handleConfirm} />
    </View>
  </View>
</ModalAdapter>
```

### Mixed Stacking

Modals and bottom sheets can coexist in the same stack:

```tsx
const { open } = useBottomSheetManager();
const modalControl = useBottomSheetControl('my-modal');

// Push a bottom sheet
open(<MyBottomSheet />, { mode: 'push' });

// Then push a modal on top
modalControl.open({ mode: 'push' });
// Both are in the stack — closing the modal returns to the bottom sheet
```
