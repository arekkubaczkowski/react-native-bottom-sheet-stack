# CustomModalAdapter

Custom React Native dialog UI. No additional dependencies needed.

## Usage

```tsx
import { CustomModalAdapter, useBottomSheetContext } from 'react-native-bottom-sheet-stack';

function MyModal() {
  const { close } = useBottomSheetContext();

  return (
    <CustomModalAdapter>
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Modal content</Text>
        <Button title="Close" onPress={close} />
      </View>
    </CustomModalAdapter>
  );
}
```

## Props

Accepts `contentContainerStyle` for the inner wrapper view.

## Mixed Stacking

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
