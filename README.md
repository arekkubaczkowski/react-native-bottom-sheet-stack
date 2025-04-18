# 🧩 BottomSheet Stack Manager

Manage a stack of [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) components with `push`, `switch`, and `replace` navigation — without unmounting underlying sheets.

> ⚠️ **Important:** Not Production Ready
> This library is currently in active development and is not yet considered production-ready.

---

## 🚀 Features

- 🧱 `push` — stack a new sheet above the current one
- 🔄 `switch` — override current sheet temporarily, restore the previous one when closing
- 🔁 `replace` — fully swap and remove the current sheet
- 🧠 Underlying sheets remain mounted
- 🗂️ Group support for isolated stacks

---

## 📦 Installation

```bash
yarn add zustand @gorhom/bottom-sheet
```

## Usage

### 🧠 Important: Use <BottomSheetManaged /> instead of <BottomSheet />

To make the stack manager work, you must replace all instances of BottomSheet from @gorhom/bottom-sheet with the provided:

```tsx
import { BottomSheetManaged } from 'react-native-bottom-sheet-stack';
```

In your app entry:

```tsx
import {
  BottomSheetHost,
  BottomSheetManager,
  initBottomSheetCoordinator,
} from 'react-native-bottom-sheet-stack';

initBottomSheetCoordinator();

export default function App() {
  return (
    <BottomSheetManager id="default">
      <BottomSheetHost />
      {/* your app content */}
    </BottomSheetManager>
  );
}
```

In a component:

```tsx
import { useBottomSheetManager } from 'react-native-bottom-sheet-stack';

export default function YouComponent() {
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <TouchableOpacity onPress={() => openBottomSheet(<YourBottomSheet />, { mode: 'switch' })}>
      <Text>Open Bottom Sheet</Text>
    </TouchableOpacity>
  );
}
```

Define your bottom sheet:

```tsx
import { BottomSheetManaged } from 'react-native-bottom-sheet-stack';

export default function YourBottomSheet() {
  return (
    <BottomSheetManaged snapPoints={['50%']}>
      {/* Sheet content */}
    </BottomSheetManaged>
  );
}
```