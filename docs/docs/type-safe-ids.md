---
sidebar_position: 7
---

# Type-Safe Portal IDs & Params

Get autocomplete and type checking for portal sheet IDs and their parameters by augmenting the `BottomSheetPortalRegistry` interface.

## Setup

### Step 1: Create a Type Declaration File

Create a file in your project (e.g., `src/types/bottom-sheet.d.ts`):

```tsx
import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'settings-sheet': true;                           // no params
    'profile-sheet': { userId: string };              // with required params
    'confirm-dialog': {
      title: string;
      onConfirm: () => void;
    };
  }
}
```

### Registry Values

| Value | Meaning |
|-------|---------|
| `true` | Sheet has no params, `open()` params are optional |
| `{ ... }` | Sheet has params, `open()` requires `params` property |

### Step 2: Include in tsconfig.json

Make sure the file is included in your TypeScript configuration:

```json
{
  "compilerOptions": {
    // ...
  },
  "include": [
    "src/**/*",
    "src/types/**/*.d.ts"
  ]
}
```

## Usage

### Opening Sheets

```tsx
const settingsControl = useBottomSheetControl('settings-sheet');
const profileControl = useBottomSheetControl('profile-sheet');

// ✅ No params required (defined as `true`)
settingsControl.open();
settingsControl.open({ scaleBackground: true });

// ✅ Params required (defined as object)
profileControl.open({
  params: { userId: '123' }  // TypeScript enforces this
});

// ❌ Error - missing required params
profileControl.open();  // TypeScript error!

// ❌ Error - wrong param type
profileControl.open({
  params: { userId: 123 }  // Error: number is not assignable to string
});
```

### Reading Params in Sheet

Use the generic parameter in `useBottomSheetState` to get typed params:

```tsx
const ProfileSheet = forwardRef((props, ref) => {
  // Pass the sheet ID as generic to get typed params
  const { close, params } = useBottomSheetState<'profile-sheet'>();

  return (
    <BottomSheetManaged ref={ref}>
      <BottomSheetView>
        <Text>User ID: {params.userId}</Text>  {/* ✅ type-safe */}
        <Button title="Close" onPress={close} />
      </BottomSheetView>
    </BottomSheetManaged>
  );
});
```

## Complete Example

```tsx
// 1. Define types (src/types/bottom-sheet.d.ts)
declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'user-details': {
      userId: string;
      showEmail: boolean;
    };
  }
}

// 2. Create the sheet component
const UserDetailsSheet = forwardRef((props, ref) => {
  const { params, close } = useBottomSheetState<'user-details'>();

  return (
    <BottomSheetManaged ref={ref} snapPoints={['50%']}>
      <BottomSheetView>
        <Text>User: {params.userId}</Text>
        {params.showEmail && <Text>email@example.com</Text>}
        <Button title="Close" onPress={close} />
      </BottomSheetView>
    </BottomSheetManaged>
  );
});

// 3. Use in your app
function App() {
  const { open } = useBottomSheetControl('user-details');

  return (
    <>
      <BottomSheetPortal id="user-details">
        <UserDetailsSheet />
      </BottomSheetPortal>

      <Button
        title="Show User"
        onPress={() => open({
          params: { userId: 'abc123', showEmail: true }
        })}
      />
    </>
  );
}
```

## Without Type Augmentation

If you don't augment the registry, the `id` accepts any `string` and `params` is `unknown`:

```tsx
// Works without augmentation - accepts any string
const control = useBottomSheetControl('any-sheet');
control.open({ params: { anything: 'goes' } });

// Params are untyped (unknown) - requires type assertion or narrowing
const { params } = useBottomSheetState();
// params is unknown
```

## Benefits

- **Autocomplete** — IDE suggests registered sheet IDs and param properties
- **Type Safety** — Catch typos and type errors at compile time
- **Required Params** — TypeScript enforces required params when opening
- **Refactoring** — Rename IDs and params across the codebase
- **Documentation** — Registry serves as a list of all portal sheets and their contracts
