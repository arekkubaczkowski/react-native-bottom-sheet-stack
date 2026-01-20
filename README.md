# react-native-bottom-sheet-stack

A stack manager for [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) with `push`, `switch`, and `replace` navigation modes, iOS-style scale animations, and React context preservation.

**[Documentation](https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/)**

## Features

- **Stack Navigation** — `push`, `switch`, and `replace` modes for managing multiple sheets
- **Scale Animation** — iOS-style background scaling effect when sheets are stacked
- **Context Preservation** — Portal-based API that preserves React context in bottom sheets
- **Underlying Sheets Stay Mounted** — Sheets remain in the stack until explicitly closed
- **Group Support** — Isolated stacks for different parts of your app

## Installation

```bash
yarn add react-native-bottom-sheet-stack
```

### Peer Dependencies

```bash
yarn add @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-teleport zustand
```

## Quick Start

### 1. Setup Provider and Host

```tsx
import {
  BottomSheetManagerProvider,
  BottomSheetHost,
  BottomSheetScaleView,
} from 'react-native-bottom-sheet-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetManagerProvider id="default">
          <BottomSheetScaleView>
            <YourAppContent />
          </BottomSheetScaleView>
          <BottomSheetHost />
        </BottomSheetManagerProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
```

### 2. Create a Bottom Sheet Component

Use `BottomSheetManaged` instead of `BottomSheet` from `@gorhom/bottom-sheet`:

```tsx
import { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomSheetManaged, useBottomSheetState } from 'react-native-bottom-sheet-stack';

const MySheet = forwardRef((props, ref) => {
  const { close } = useBottomSheetState();

  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <BottomSheetView>
        <View style={{ padding: 20 }}>
          <Text>Hello from Bottom Sheet!</Text>
          <Button title="Close" onPress={close} />
        </View>
      </BottomSheetView>
    </BottomSheetManaged>
  );
});
```

### 3. Open Bottom Sheets

```tsx
import { useBottomSheetManager } from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { openBottomSheet } = useBottomSheetManager();

  const handleOpen = () => {
    openBottomSheet(<MySheet />, {
      mode: 'push', // 'push' | 'switch' | 'replace'
      scaleBackground: true,
    });
  };

  return <Button title="Open Sheet" onPress={handleOpen} />;
}
```

## Navigation Modes

| Mode | Description |
|------|-------------|
| `push` | Stack a new sheet on top. Previous sheet remains visible underneath. |
| `switch` | Hide current sheet and show new one. Previous sheet is restored when new one closes. |
| `replace` | Close current sheet and open new one. Previous sheet is removed from stack. |

## Scale Animation

Wrap your app content in `BottomSheetScaleView` to enable iOS-style scaling:

```tsx
<BottomSheetManagerProvider
  id="default"
  scaleConfig={{ scale: 0.92, translateY: 0, borderRadius: 24 }}
>
  <BottomSheetScaleView>
    <YourAppContent />
  </BottomSheetScaleView>
  <BottomSheetHost />
</BottomSheetManagerProvider>
```

> **Important:** `BottomSheetHost` must be **outside** of `BottomSheetScaleView`. If you wrap `BottomSheetHost` inside `BottomSheetScaleView`, the bottom sheets themselves will also scale, which is not the desired behavior.

Open sheets with `scaleBackground: true`:

```tsx
openBottomSheet(<MySheet />, { scaleBackground: true });
```

## Context Preservation (Portal API)

The imperative `openBottomSheet()` API stores content in a Zustand store and renders it in `BottomSheetHost`. This means **React context from your component tree is lost**.

For cases where you need context (themes, auth, i18n, etc.), use the **portal-based API**:

```tsx
import {
  BottomSheetPortal,
  useBottomSheetControl,
} from 'react-native-bottom-sheet-stack';

function MyComponent() {
  const { open, close, isOpen } = useBottomSheetControl('my-sheet');

  return (
    <View>
      {/* Declare the portal - content is rendered here in your React tree */}
      <BottomSheetPortal id="my-sheet">
        <MySheet />
      </BottomSheetPortal>

      {/* Control it imperatively */}
      <Button title="Open" onPress={() => open({ scaleBackground: true })} />
    </View>
  );
}
```

### How It Works

| API | Context | Use Case |
|-----|---------|----------|
| `openBottomSheet()` | Lost | Dynamic sheets, simple cases |
| `BottomSheetPortal` | Preserved | Sheets needing theme, auth, i18n, etc. |

The portal API uses [react-native-teleport](https://github.com/nicklockwood/react-native-teleport) to render content in your component tree while displaying it in `BottomSheetHost`.

### Type-Safe Portal IDs & Params

You can get autocomplete and type checking for portal sheet IDs and their parameters by augmenting the `BottomSheetPortalRegistry` interface.

**Step 1:** Create a type declaration file in your project (e.g., `src/types/bottom-sheet.d.ts`):

```tsx
import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'settings-sheet': true;                    // no params
    'profile-sheet': { userId: string };       // with required params
  }
}
```

| Value | Meaning |
|-------|---------|
| `true` | Sheet has no params |
| `{ ... }` | Sheet has required params |

**Step 2:** Make sure the file is included in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    // ...
  },
  "include": [
    "src/**/*",
    "src/types/**/*.d.ts"  // include your declaration files
  ]
}
```

**Step 3:** Now TypeScript will autocomplete and validate IDs and params:

```tsx
// ✅ No params required (defined as `true`)
settingsControl.open();

// ✅ Params required (defined as object)
profileControl.open({ params: { userId: '123' } });

// ❌ Error - missing required params
profileControl.open();  // TypeScript error!
```

**Step 4:** Access typed params inside your sheet:

```tsx
const ProfileSheet = forwardRef((props, ref) => {
  // Pass the sheet ID as generic to get typed params
  const { params, close } = useBottomSheetState<'profile-sheet'>();

  return (
    <BottomSheetManaged ref={ref}>
      <Text>User ID: {params.userId}</Text>  {/* ✅ type-safe */}
    </BottomSheetManaged>
  );
});
```

If you don't augment the registry, the `id` accepts any `string` and `params` is `unknown`.

## API Reference

### Components

#### `BottomSheetManagerProvider`

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier for this stack group |
| `scaleConfig` | `ScaleConfig` | Optional scale animation configuration |

#### `BottomSheetHost`

Renders the bottom sheet stack. Place after your app content inside `BottomSheetManagerProvider`.

#### `BottomSheetScaleView`

Wrapper that applies scale animation to its children when sheets are opened with `scaleBackground: true`.

#### `BottomSheetManaged`

Drop-in replacement for `BottomSheet` from `@gorhom/bottom-sheet`. Accepts all the same props.

#### `BottomSheetPortal`

| Prop | Type | Description |
|------|------|-------------|
| `id` | `BottomSheetPortalId` | Unique identifier for this portal sheet (type-safe if registry is augmented) |
| `children` | `ReactElement` | The bottom sheet component to render |

### Hooks

#### `useBottomSheetManager()`

```tsx
const {
  openBottomSheet,  // (content, options?) => id
  close,            // (id) => void
  clearAll,         // () => void
} = useBottomSheetManager();
```

#### `useBottomSheetState<T>()`

Use inside a bottom sheet component. Pass a portal ID as generic for typed params:

```tsx
const {
  bottomSheetState,  // { id, status, groupId, ... }
  params,            // typed if generic provided, unknown otherwise
  close,             // () => void
} = useBottomSheetState<'my-sheet'>();
```

#### `useBottomSheetControl<T>(id: T)`

Control portal-based sheets. Params are type-safe if registry is augmented:

```tsx
const {
  open,    // (options?) => void - options include typed params
  close,   // () => void
  isOpen,  // boolean
  status,  // 'opening' | 'open' | 'closing' | 'hidden' | null
} = useBottomSheetControl('my-sheet');

// Open with params (required if defined in registry)
open({ params: { userId: '123' }, scaleBackground: true });
```

### Types

#### `BottomSheetPortalRegistry`

Interface to augment for type-safe portal IDs and params. See [Type-Safe Portal IDs & Params](#type-safe-portal-ids--params).

#### `BottomSheetPortalId`

Type for portal sheet IDs. If `BottomSheetPortalRegistry` is augmented, this is a union of registered keys. Otherwise, it's `string`.

#### `BottomSheetPortalParams<T>`

Type helper to extract params for a given portal sheet ID. Returns `undefined` if the sheet has no params (`true` in registry), or the param type if defined.

## Example

See the [example app](./example) for a full demo including:
- Navigation flow (push, switch, replace)
- Nested scale animations
- Context preservation comparison

## License

MIT
