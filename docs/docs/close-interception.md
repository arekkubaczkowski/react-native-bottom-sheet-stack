---
sidebar_position: 8
---

# Close Interception

Close interception lets you prevent a sheet from closing until a condition is met — for example, confirming unsaved changes or completing a required step.

## useOnBeforeClose

The `useOnBeforeClose` hook registers an interceptor that runs before the sheet closes. Return `false` to block the close, or `true` to allow it.

:::warning Inside Sheet Only
This hook can **only** be used inside a sheet adapter component. It reads from React context — no ID parameter needed.
:::

```tsx
import { useState } from 'react';
import { Alert } from 'react-native';
import {
  useBottomSheetContext,
  useOnBeforeClose,
} from 'react-native-bottom-sheet-stack';

function EditProfileSheet() {
  const [dirty, setDirty] = useState(false);
  const { forceClose } = useBottomSheetContext();

  useOnBeforeClose(() => {
    if (!dirty) return true;

    Alert.alert('Discard changes?', 'You have unsaved changes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => forceClose() },
    ]);
    return false;
  });

  return (
    // ... form UI that sets dirty=true on change
  );
}
```

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

## Async Interceptors

The callback can return a `Promise<boolean>` for async confirmation flows:

```tsx
useOnBeforeClose(async () => {
  const confirmed = await showConfirmDialog();
  return confirmed;
});
```

If the promise rejects (throws), the close is cancelled for safety.

## forceClose — Bypassing the Interceptor

`forceClose()` from `useBottomSheetContext` skips the interceptor entirely and closes the sheet immediately. This is the escape hatch for confirmation dialogs:

```tsx
const { forceClose } = useBottomSheetContext();

useOnBeforeClose(() => {
  Alert.alert('Are you sure?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Close', onPress: () => forceClose() },
  ]);
  return false; // Block the initial close
});
```

## closeAll Interaction

When `closeAll()` encounters a sheet with an `onBeforeClose` interceptor that returns `false`, the cascade **stops at that sheet**. Sheets below it remain open:

```
Stack: [SheetA, SheetB (has interceptor), SheetC]

closeAll() closes from top:
  1. SheetC → closed ✅
  2. SheetB → interceptor returns false ❌
  3. SheetA → never reached (cascade stopped)

Result: [SheetA, SheetB] remain open
```

## Adapter Support

For `useOnBeforeClose` to fully work, the adapter must respect the `preventDismiss` prop. All built-in adapters support this:

| Adapter | preventDismiss support |
|---------|----------------------|
| `GorhomSheetAdapter` | `enablePanDownToClose={false}` when active |
| `CustomModalAdapter` | Disables backdrop press |
| `ReactNativeModalAdapter` | Disables swipe and backdrop press |
| `ActionsSheetAdapter` | `closable={false}` when active |

If you're building a [custom adapter](/custom-adapters), read the `preventDismiss` value from the store and disable native dismiss gestures accordingly.
