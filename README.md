# 🧩 BottomSheet Stack Manager

Manage a stack of [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) components with `push`, `switch`, and `replace` navigation — without unmounting underlying sheets.

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

```tsx
import { BottomSheetHost } from './bottomSheet/BottomSheetHost'
import { initBottomSheetCoordinator } from './bottomSheet/coordinator'

initBottomSheetCoordinator()

export default function App() {
  return (
    <BottomSheetManager id="default">
      <BottomSheetHost />
      {/* your app content */}
    </BottomSheetManager>
  )
}
```

