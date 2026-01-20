---
sidebar_position: 6
---

# Type-Safe Portal IDs

Get autocomplete and type checking for portal sheet IDs by augmenting the `BottomSheetPortalRegistry` interface.

## Setup

### Step 1: Create a Type Declaration File

Create a file in your project (e.g., `src/types/bottom-sheet.d.ts`):

```tsx
import 'react-native-bottom-sheet-stack';

declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'settings-sheet': true;
    'profile-sheet': true;
    'confirm-dialog': true;
  }
}
```

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

### Step 3: Use Type-Safe IDs

Now TypeScript will autocomplete and validate the `id` prop:

```tsx
// ✅ Valid - 'settings-sheet' is in registry
<BottomSheetPortal id="settings-sheet">
const control = useBottomSheetControl('settings-sheet');

// ❌ Error - 'unknown-sheet' is not in registry
<BottomSheetPortal id="unknown-sheet">
const control = useBottomSheetControl('unknown-sheet');
```

## Without Type Augmentation

If you don't augment the registry, the `id` accepts any `string` for flexibility:

```tsx
// Works without augmentation - accepts any string
<BottomSheetPortal id="any-string-works">
const control = useBottomSheetControl('any-string-works');
```

## Benefits

- **Autocomplete** — IDE suggests registered sheet IDs
- **Type Safety** — Catch typos at compile time
- **Refactoring** — Rename IDs across the codebase
- **Documentation** — Registry serves as a list of all portal sheets
