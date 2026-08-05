---
sidebar_position: 7
---

# Persistent Sheets

Persistent sheets are **pre-mounted** bottom sheets that stay in memory even when closed. They open instantly without mount delay and preserve their internal state between open/close cycles.

## When to Use

- **Frequently accessed sheets** - Scanner, camera, quick actions
- **State preservation** - Forms, multi-step wizards, media players
- **Instant open** - When mount delay is noticeable

## Basic Usage

```tsx
import {
  BottomSheetPersistent,
  useBottomSheetControl,
} from 'react-native-bottom-sheet-stack';

function App() {
  return (
    <BottomSheetManagerProvider id="main">
      <BottomSheetScaleView>
        <HomeScreen />
      </BottomSheetScaleView>
      <BottomSheetHost />

      {/* Persistent sheet - always mounted */}
      <BottomSheetPersistent id="scanner">
        <ScannerSheet />
      </BottomSheetPersistent>
    </BottomSheetManagerProvider>
  );
}

function HomeScreen() {
  const scanner = useBottomSheetControl('scanner');

  return (
    <Button
      title="Open Scanner"
      onPress={() => scanner.open({ scaleBackground: true })}
    />
  );
}
```

:::note
`open()` takes no `params` here because this ID is not registered in
`BottomSheetPortalRegistry`. Once you register it with a params object, `params`
becomes **required** — see [Type Safety](#type-safety) below.
:::

## State Preservation

Internal component state is preserved between open/close cycles:

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';

const ScannerSheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetContext();
  // State is preserved when sheet is closed and reopened
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    // ... scanning logic
    setScanResult('QR-ABC123');
    setIsScanning(false);
  };

  return (
    <GorhomSheetAdapter ref={ref} enableDynamicSizing>
      <View>
        {scanResult ? (
          <Text>Result: {scanResult}</Text>
        ) : (
          <Button title="Start Scan" onPress={handleScan} />
        )}
        <Button title="Close" onPress={close} />
      </View>
    </GorhomSheetAdapter>
  );
});
```

Close the sheet and reopen it - `scanResult` is still there.


## Comparison with Portal API

| Feature | `BottomSheetPortal` | `BottomSheetPersistent` |
|---------|--------------------|-----------------------|
| Context preservation | ✅ | ✅ |
| State preservation | ❌ (remounts) | ✅ |
| Instant open | ❌ | ✅ |
| Memory usage | Lower | Higher |
| Best for | Regular sheets | Frequently used sheets |

## Passing Params

You can pass params when opening:

```tsx
const scanner = useBottomSheetControl('scanner');

scanner.open({
  scaleBackground: true,
  params: { source: 'home', title: 'Scan QR Code' },
});
```

Access them in the sheet:

```tsx
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';

const ScannerSheet = forwardRef((props, ref) => {
  const { params } = useBottomSheetContext<'scanner'>();

  return (
    <GorhomSheetAdapter ref={ref}>
      <Text>{params?.title ?? 'Scanner'}</Text>
    </GorhomSheetAdapter>
  );
});
```

## Type Safety

Register your persistent sheet IDs for type-safe params:

```tsx
// bottom-sheet.d.ts
declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    scanner: { source: 'home' | 'navigation'; title?: string };
  }
}
```

Now `useBottomSheetControl('scanner')` has typed `open()` and `params`.

:::warning Registering params makes them required
An object entry in the registry means every `open()` for that ID **must** pass
`params`. With the declaration above, the simple call from
[Basic Usage](#basic-usage) no longer typechecks:

```tsx
scanner.open({ scaleBackground: true });
// ❌ Property 'params' is missing

scanner.open({ scaleBackground: true, params: { source: 'home' } });
// ✅
```

If you want the params to stay optional, register the ID as `true` instead and
read `params` untyped.
:::

Inside the sheet, params are always `T | undefined` — `resetParams()` can clear
them while the sheet is open — so read them with `params?.title`, as above.

## Placement

`BottomSheetPersistent` can be placed **anywhere** inside `BottomSheetManagerProvider` - at the app root, on a specific screen, or nested deep in your component tree.

The only requirement: **it must stay mounted** to be accessible. If you unmount it, the sheet won't be available until it mounts again.

```tsx
// Option 1: At app root - always available
<BottomSheetManagerProvider id="main">
  <BottomSheetScaleView>
    <App />
  </BottomSheetScaleView>
  <BottomSheetHost />
  <BottomSheetPersistent id="scanner">
    <ScannerSheet />
  </BottomSheetPersistent>
</BottomSheetManagerProvider>

// Option 2: On a specific screen - available only when screen is mounted
function HomeScreen() {
  return (
    <View>
      <BottomSheetPersistent id="quick-actions">
        <QuickActionsSheet />
      </BottomSheetPersistent>
      {/* ... screen content */}
    </View>
  );
}
```

:::tip
For sheets that should be accessible from anywhere in your app, place them at the root level to ensure they're always mounted.
:::
