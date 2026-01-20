---
sidebar_position: 3
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
openBottomSheet(<SheetA />, { mode: 'push' });
// Stack: [SheetA]

openBottomSheet(<SheetB />, { mode: 'push' });
// Stack: [SheetA, SheetB]

// Close SheetB -> Stack: [SheetA]
```

## Switch Mode

Switch hides the current sheet and shows the new one. When the new sheet is closed, the previous sheet is restored.

```tsx
openBottomSheet(<SheetA />, { mode: 'push' });
// Stack: [SheetA (visible)]

openBottomSheet(<SheetB />, { mode: 'switch' });
// Stack: [SheetA (hidden), SheetB (visible)]

// Close SheetB -> SheetA becomes visible again
```

## Replace Mode

Replace closes the current sheet entirely and opens a new one in its place.

```tsx
openBottomSheet(<SheetA />, { mode: 'push' });
// Stack: [SheetA]

openBottomSheet(<SheetB />, { mode: 'replace' });
// Stack: [SheetB] (SheetA is removed)
```

## Usage Example

```tsx
function NavigationExample() {
  const { openBottomSheet } = useBottomSheetManager();

  return (
    <View>
      <Button
        title="Push Sheet"
        onPress={() => openBottomSheet(<MySheet />, { mode: 'push' })}
      />
      <Button
        title="Switch Sheet"
        onPress={() => openBottomSheet(<MySheet />, { mode: 'switch' })}
      />
      <Button
        title="Replace Sheet"
        onPress={() => openBottomSheet(<MySheet />, { mode: 'replace' })}
      />
    </View>
  );
}
```
