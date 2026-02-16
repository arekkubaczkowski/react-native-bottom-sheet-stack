---
sidebar_position: 4
---

# Navigation Modes

The library supports three navigation modes for managing bottom sheet stacks:

| Mode | Description |
|------|-------------|
| `push` | Stack a new sheet on top. Previous sheet remains visible underneath. |
| `switch` | Hide current sheet and show new one. Previous sheet is restored when new one closes. |
| `replace` | Close current sheet and open new one. Previous sheet is removed from stack. |

## Push Mode

Push stacks sheets on top of each other. Each sheet remains in the stack until explicitly closed.

```tsx
open(<SheetA />, { mode: 'push' });
// Stack: [SheetA]

open(<SheetB />, { mode: 'push' });
// Stack: [SheetA, SheetB]

// Close SheetB -> Stack: [SheetA]
```

## Switch Mode

Switch hides the current sheet and shows the new one. When the new sheet is closed, the previous sheet is restored.

```tsx
open(<SheetA />, { mode: 'push' });
// Stack: [SheetA (visible)]

open(<SheetB />, { mode: 'switch' });
// Stack: [SheetA (hidden), SheetB (visible)]

// Close SheetB -> SheetA becomes visible again
```

## Replace Mode

Replace closes the current sheet entirely and opens a new one in its place.

```tsx
open(<SheetA />, { mode: 'push' });
// Stack: [SheetA]

open(<SheetB />, { mode: 'replace' });
// Stack: [SheetB] (SheetA is removed)
```

## Usage Example

```tsx
function NavigationExample() {
  const { open } = useBottomSheetManager();

  return (
    <View>
      <Button
        title="Push Sheet"
        onPress={() => open(<MySheet />, { mode: 'push' })}
      />
      <Button
        title="Switch Sheet"
        onPress={() => open(<MySheet />, { mode: 'switch' })}
      />
      <Button
        title="Replace Sheet"
        onPress={() => open(<MySheet />, { mode: 'replace' })}
      />
    </View>
  );
}
```
