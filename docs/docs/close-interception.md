---
sidebar_position: 8
---

# Close Interception

Close interception lets you prevent a sheet from closing until a condition is met — for example, confirming unsaved changes or completing a required step.

## useOnBeforeClose

The `useOnBeforeClose` hook registers an interceptor that runs before the sheet closes. It receives `onConfirm` and `onCancel` callbacks that you call when the user makes a decision.

:::warning Inside Sheet Only
This hook can **only** be used inside a sheet adapter component. It reads from React context — no ID parameter needed.
:::

```tsx
import { useState } from 'react';
import { Alert } from 'react-native';
import { useOnBeforeClose } from 'react-native-bottom-sheet-stack';

function EditProfileSheet() {
  const [dirty, setDirty] = useState(false);

  useOnBeforeClose(({ onConfirm, onCancel }) => {
    if (!dirty) {
      onConfirm(); // Allow close immediately
      return;
    }

    Alert.alert('Discard changes?', 'You have unsaved changes.', [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Discard', style: 'destructive', onPress: onConfirm },
    ]);
  });

  return (
    // ... form UI that sets dirty=true on change
  );
}
```

This callback-based API works seamlessly with `Alert.alert` and makes `closeAll()` properly wait for user decisions.

## How It Works

When `useOnBeforeClose` is active, two things happen:

1. **Native gesture blocking** — The sheet sets `preventDismiss: true`, which tells adapters to block user-initiated dismiss gestures (swipe down, pan-to-close). This ensures the interceptor always runs.

2. **Programmatic close interception** — All close paths (`close()`, backdrop tap, back button, `closeAll()`) call the interceptor before proceeding. If the interceptor returns `false`, the close is cancelled.

```
User taps backdrop / swipes / calls close()
              │
              ▼
     ┌─────────────────┐
     │ onBeforeClose()  │
     │ registered?      │
     └────────┬────────┘
              │
       ┌──────┴──────┐
      YES             NO
       │               │
       ▼               ▼
┌──────────────┐  ┌──────────┐
│ Call callback │  │ Close    │
│              │  │ proceeds │
└──────┬───────┘  └──────────┘
       │
  ┌────┴────┐
  │         │
 true     false
  │         │
  ▼         ▼
Close    Close
proceeds cancelled
```

## Alternative Patterns

### Callback Pattern (Recommended)

The callback pattern with `onConfirm`/`onCancel` is recommended for most use cases. It naturally integrates with `Alert.alert` and works seamlessly with `closeAll()`:

```tsx
useOnBeforeClose(({ onConfirm, onCancel }) => {
  if (isDirty) {
    Alert.alert('Discard?', '', [
      { text: 'Cancel', onPress: onCancel },
      { text: 'Discard', onPress: onConfirm },
    ]);
  } else {
    onConfirm();
  }
});
```

### Boolean Return (Backward Compatible)

For simple synchronous checks, you can return a boolean:

```tsx
useOnBeforeClose(() => {
  return !isDirty; // false blocks, true allows
});
```

### Async Promise (Backward Compatible)

For async confirmation flows using custom dialogs:

```tsx
useOnBeforeClose(async () => {
  const confirmed = await showCustomDialog();
  return confirmed;
});
```

If the promise rejects (throws), the close is cancelled for safety.

## forceClose — Bypassing the Interceptor

`forceClose()` from `useBottomSheetContext` skips the interceptor entirely and closes the sheet immediately. With the callback pattern, you rarely need this — just call `onConfirm()` instead. However, it's still useful for programmatic force-closes from outside the interceptor:

```tsx
const { forceClose } = useBottomSheetContext();

// Force close from anywhere (bypasses interceptor)
<Button title="Force Close" onPress={forceClose} />
```

## closeAll Interaction

When `closeAll()` encounters a sheet with an `onBeforeClose` interceptor, it **waits for the user's decision** before continuing:

```
Stack: [SheetA, SheetB (has interceptor), SheetC]

closeAll() closes from top:
  1. SheetC → closed ✅
  2. SheetB → shows confirmation alert, WAITS for user
      - User clicks "Confirm" → onConfirm() called
      - SheetB closes ✅
  3. SheetA → closes ✅

Result: All sheets closed (if user confirmed)
```

If the user clicks "Cancel" (calling `onCancel()`), the cascade stops at that sheet:

```
closeAll() with user cancellation:
  1. SheetC → closed ✅
  2. SheetB → shows confirmation alert
      - User clicks "Cancel" → onCancel() called
      - SheetB stays open ❌
  3. SheetA → never reached (cascade stopped)

Result: [SheetA, SheetB] remain open
```

This seamless integration with `closeAll()` is why the callback pattern is recommended over the boolean return pattern.

## Adapter Support

For `useOnBeforeClose` to fully work, the adapter must respect the `preventDismiss` prop. All built-in adapters support this:

| Adapter | preventDismiss support |
|---------|----------------------|
| `GorhomSheetAdapter` | `enablePanDownToClose={false}` when active |
| `CustomModalAdapter` | Disables backdrop press |
| `ReactNativeModalAdapter` | Disables swipe and backdrop press |
| `ActionsSheetAdapter` | `closable={false}` when active |

If you're building a [custom adapter](/custom-adapters), read the `preventDismiss` value from the store and disable native dismiss gestures accordingly.
