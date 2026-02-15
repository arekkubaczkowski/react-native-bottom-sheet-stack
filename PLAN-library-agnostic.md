# Plan: Library-Agnostic Adapter Architecture

## Current State Analysis

### Coupling Points with @gorhom/bottom-sheet

The library has **6 files** that directly import from `@gorhom/bottom-sheet`:

| File | What's Imported | Purpose |
|------|-----------------|---------|
| `BottomSheetManaged.tsx` | `BottomSheet`, `useBottomSheetSpringConfigs`, `BottomSheetProps`, `BottomSheetMethods` | Wraps gorhom component, wires events |
| `refsMap.ts` | `BottomSheetMethods` | Types the ref map |
| `BottomSheetRef.context.ts` | `BottomSheetMethods` | Types the ref context |
| `useBottomSheetManager.tsx` | `BottomSheetMethods` | Creates refs for inline sheets |
| `useBottomSheetControl.ts` | `BottomSheetMethods` | Creates refs for portal sheets |
| `BottomSheetPersistent.tsx` | `BottomSheetMethods` | Creates refs for persistent sheets |

### What the Coordinator Actually Needs from a Ref

Looking at `bottomSheetCoordinator.ts`, only **2 methods** are ever called:
- `ref.expand()` — to show the sheet
- `ref.close()` — to hide the sheet

### What the Coordinator Receives Back (Events)

From `createSheetEventHandlers`, 3 signals flow from UI → Store:
- `handleAnimate(fromIndex, toIndex)` — User initiated dismiss (toIndex === -1)
- `handleChange(index)` — Sheet reached a snap point (index >= 0 means opened)
- `handleClose()` — Sheet fully closed (animation done)

### What's Already Library-Agnostic

The core architecture is actually well-separated:
- **Store** (`store/`) — Pure state machine, no gorhom imports
- **Stack management** — push/switch/replace modes
- **Portal system** — react-native-teleport
- **Scale animations** — Uses reanimated but conceptually agnostic
- **Group isolation** — Pure store logic
- **Status hooks** — `useBottomSheetStatus`, `useBottomSheetContext`

---

## Proposed Adapter Architecture

### Core Insight

The coupling is thin. We only need to abstract:
1. **Ref interface**: `expand()` + `close()` (already minimal)
2. **Event contract**: How the adapter signals state changes to the store
3. **Animation progress**: How the adapter reports animation position (for backdrop/scale)
4. **Component wrapper**: What renders the actual UI

### Adapter Interface

```typescript
/**
 * Minimal ref interface that any sheet/modal adapter must implement.
 * The coordinator calls these to control the UI.
 */
interface SheetAdapterRef {
  expand(): void;
  close(): void;
}

/**
 * Event handlers the adapter MUST call to sync UI → Store.
 * Returned by createSheetEventHandlers(sheetId).
 */
interface SheetAdapterEvents {
  /** Call when user initiates dismiss (e.g. swipe down, backdrop tap) */
  onDismiss(): void;
  /** Call when show animation completes (sheet is fully visible) */
  onOpened(): void;
  /** Call when hide animation completes (sheet is fully hidden) */
  onClosed(): void;
}

/**
 * Optional: Shared animation value for backdrop/scale integration.
 * Range: -1 (hidden) to 0+ (visible).
 * If adapter doesn't provide this, backdrop will use binary opacity.
 */
type AnimationProgress = SharedValue<number>;
```

### Adapter Contract (Component)

An adapter is a React component that:
1. Accepts `children` (the sheet content)
2. Exposes a ref implementing `SheetAdapterRef`
3. Calls `SheetAdapterEvents` at the right lifecycle points
4. Optionally drives an `AnimationProgress` shared value

```typescript
// Generic adapter component signature
type SheetAdapter = React.ForwardRefExoticComponent<
  SheetAdapterProps & React.RefAttributes<SheetAdapterRef>
>;

interface SheetAdapterProps {
  children: React.ReactNode;
  /** Sheet ID for event handler wiring */
  sheetId: string;
  /** Animation progress shared value (adapter should drive this) */
  animatedIndex?: SharedValue<number>;
  /** Any adapter-specific props go here via generics */
  [key: string]: unknown;
}
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    CORE (library-agnostic)                        │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Zustand     │  │  Coordinator     │  │  animatedRegistry  │  │
│  │  Store       │◄─┤  (uses           │  │  (SharedValues)    │  │
│  │  (state      │  │  SheetAdapterRef │  │                    │  │
│  │   machine)   │  │  interface only) │  │                    │  │
│  └─────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  refsMap     │  │  QueueItem       │  │  Scale/Backdrop    │  │
│  │  (stores     │  │  (renders        │  │  (uses animation   │  │
│  │  SheetAdapter│  │  adapter slot)   │  │  progress)         │  │
│  │  Ref)        │  │                  │  │                    │  │
│  └─────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Hooks: useBottomSheetControl, useBottomSheetManager,       │ │
│  │         useBottomSheetContext, useBottomSheetStatus          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │    Adapter Interface          │
                    │    SheetAdapterRef            │
                    │    SheetAdapterEvents         │
                    └──────┬──────────────┬────────┘
                           │              │
              ┌────────────┴───┐  ┌───────┴──────────┐
              ▼                ▼  ▼                    ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Gorhom Adapter   │  │  Modal Adapter    │  │  Custom Adapter  │
    │  (bottom-sheet)   │  │  (RN Modal)       │  │  (anything)      │
    │                   │  │                   │  │                   │
    │  - snapPoints     │  │  - animationType  │  │  - ...           │
    │  - gestures       │  │  - presentStyle   │  │                  │
    │  - spring config  │  │  - onRequestClose │  │                  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Detailed Refactoring Steps

### Step 1: Define Adapter Types (`src/adapter.types.ts`)

```typescript
import type { RefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Minimal ref interface for controlling a sheet/modal.
 * Every adapter must implement these two methods.
 */
export interface SheetAdapterRef {
  /** Show the sheet/modal (called by coordinator on status → 'opening') */
  expand(): void;
  /** Hide the sheet/modal (called by coordinator on status → 'closing'/'hidden') */
  close(): void;
}

/**
 * Event handlers that adapters call to sync UI state back to the store.
 */
export interface SheetAdapterEvents {
  /** User-initiated dismiss (swipe down, backdrop tap, hardware back) */
  handleDismiss(): void;
  /** Show animation completed — sheet is fully visible and interactive */
  handleOpened(): void;
  /** Hide animation completed — sheet is fully hidden */
  handleClosed(): void;
}

export type SheetRef = RefObject<SheetAdapterRef | null>;
```

### Step 2: Update `refsMap.ts`

Replace `BottomSheetMethods` with `SheetAdapterRef`:

```typescript
import type { RefObject } from 'react';
import type { SheetAdapterRef } from './adapter.types';

type SheetRef = RefObject<SheetAdapterRef | null>;

const sheetRefsMap = new Map<string, SheetRef>();
// ... rest unchanged
```

### Step 3: Update `BottomSheetRef.context.ts`

Replace `BottomSheetMethods` with `SheetAdapterRef`:

```typescript
import type { SheetAdapterRef } from './adapter.types';
type SheetRef = RefObject<SheetAdapterRef | null>;
```

### Step 4: Update `bottomSheetCoordinator.ts`

Already only uses `expand()` and `close()` — will work with `SheetAdapterRef` unchanged.

Simplify `createSheetEventHandlers` to match the adapter event contract:

```typescript
export function createSheetEventHandlers(sheetId: string): SheetAdapterEvents {
  return {
    handleDismiss() {
      const currentStatus = useBottomSheetStore.getState().sheetsById[sheetId]?.status;
      if (currentStatus === 'open' || currentStatus === 'opening') {
        startClosing(sheetId);
      }
    },
    handleOpened() {
      const currentStatus = useBottomSheetStore.getState().sheetsById[sheetId]?.status;
      if (currentStatus === 'opening') {
        markOpen(sheetId);
      }
    },
    handleClosed() {
      const currentStatus = useBottomSheetStore.getState().sheetsById[sheetId]?.status;
      if (currentStatus !== 'hidden') {
        finishClosing(sheetId);
      }
    },
  };
}
```

### Step 5: Update Hooks

Replace `React.createRef<BottomSheetMethods>()` with `React.createRef<SheetAdapterRef>()` in:
- `useBottomSheetManager.tsx`
- `useBottomSheetControl.ts`

Replace `useRef<BottomSheetMethods>(null)` in:
- `BottomSheetPersistent.tsx`

### Step 6: Create Gorhom Adapter (`src/adapters/gorhom/GorhomSheetAdapter.tsx`)

Move current `BottomSheetManaged` logic into a gorhom-specific adapter:

```typescript
import BottomSheetOriginal, {
  useBottomSheetSpringConfigs,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import type { SheetAdapterRef } from '../../adapter.types';

export interface GorhomSheetAdapterProps extends BottomSheetProps {}

export const GorhomSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  GorhomSheetAdapterProps
>((props, ref) => {
  // Wraps gorhom BottomSheet
  // Implements SheetAdapterRef via useImperativeHandle
  // Calls SheetAdapterEvents from gorhom callbacks
  // Manages animatedIndex sync
});
```

### Step 7: Create Modal Adapter (`src/adapters/modal/ModalAdapter.tsx`)

Example adapter for React Native Modal:

```typescript
import { Modal } from 'react-native';
import type { SheetAdapterRef } from '../../adapter.types';

export interface ModalAdapterProps {
  animationType?: 'none' | 'slide' | 'fade';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet';
  children: React.ReactNode;
}

export const ModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ModalAdapterProps
>((props, ref) => {
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    expand: () => setVisible(true),
    close: () => setVisible(false),
  }));

  // Wire events:
  // - onShow → handleOpened()
  // - onRequestClose → handleDismiss()
  // - onDismiss → handleClosed()
});
```

### Step 8: Re-export for Backward Compatibility

Keep `BottomSheetManaged` as a re-export of `GorhomSheetAdapter`:

```typescript
// src/BottomSheetManaged.tsx (backward compat)
export { GorhomSheetAdapter as BottomSheetManaged } from './adapters/gorhom';
export type { SheetAdapterRef as BottomSheetRef } from './adapter.types';
```

### Step 9: Update `animatedRegistry.ts`

Make animation progress optional for adapters that don't support smooth animation:
- Modal adapter: Set progress to 0 (hidden) or 1 (visible) immediately
- Gorhom adapter: Drive progress from gorhom's `animatedIndex` as before
- Backdrop: Already interpolates [-1, 0] → [0, 1], works with both

### Step 10: Update peer dependencies

Make `@gorhom/bottom-sheet` an optional peer dependency:

```json
{
  "peerDependencies": {
    "@gorhom/bottom-sheet": ">=5.0.0",
    "react-native-reanimated": ">=3.0.0"
  },
  "peerDependenciesMeta": {
    "@gorhom/bottom-sheet": {
      "optional": true
    },
    "react-native-gesture-handler": {
      "optional": true
    }
  }
}
```

---

## File Structure After Refactoring

```
src/
├── adapter.types.ts                    # SheetAdapterRef, SheetAdapterEvents
├── index.tsx                           # Public exports (updated)
│
├── core/                               # Library-agnostic core
│   ├── store/                          # Zustand store (unchanged)
│   ├── bottomSheetCoordinator.ts       # Uses SheetAdapterRef
│   ├── refsMap.ts                      # Uses SheetAdapterRef
│   ├── animatedRegistry.ts             # Unchanged
│   ├── portalSessionRegistry.ts        # Unchanged
│   ├── BottomSheetHost.tsx             # Unchanged
│   ├── QueueItem.tsx                   # Unchanged
│   ├── BottomSheetBackdrop.tsx         # Unchanged
│   ├── BottomSheetScaleView.tsx        # Unchanged
│   ├── BottomSheetPortal.tsx           # Uses SheetAdapterRef
│   ├── BottomSheetPersistent.tsx       # Uses SheetAdapterRef
│   ├── BottomSheetManagerProvider.tsx   # Unchanged
│   └── hooks/
│       ├── useBottomSheetManager.tsx    # Uses SheetAdapterRef
│       ├── useBottomSheetControl.ts    # Uses SheetAdapterRef
│       ├── useBottomSheetContext.ts    # Unchanged
│       ├── useBottomSheetStatus.ts    # Unchanged
│       ├── useScaleAnimation.ts       # Unchanged
│       └── useSheetRenderData.ts      # Unchanged
│
├── adapters/
│   ├── gorhom/
│   │   ├── index.ts
│   │   └── GorhomSheetAdapter.tsx      # Current BottomSheetManaged logic
│   └── modal/
│       ├── index.ts
│       └── ModalAdapter.tsx            # RN Modal adapter
│
├── BottomSheetManaged.tsx              # Re-export of GorhomSheetAdapter (compat)
└── ...contexts (unchanged)
```

---

## Key Design Decisions

### 1. Per-Sheet Adapter (Not Global)

Each sheet can use a different adapter. This allows mixing bottom sheets and modals in the same stack:

```tsx
// A bottom sheet
<BottomSheetPortal id="settings">
  <GorhomSheetAdapter snapPoints={['50%']}>
    <Settings />
  </GorhomSheetAdapter>
</BottomSheetPortal>

// A modal in the same stack
<BottomSheetPortal id="confirm-dialog">
  <ModalAdapter presentationStyle="formSheet">
    <ConfirmDialog />
  </ModalAdapter>
</BottomSheetPortal>

// Both are stackable, both use same push/switch/replace modes
const { open } = useBottomSheetControl('settings');
open({ mode: 'push' });  // pushes a bottom sheet

const { open: openDialog } = useBottomSheetControl('confirm-dialog');
openDialog({ mode: 'push' });  // pushes a modal on top
```

### 2. Animation Progress Stays reanimated-Based

`SharedValue<number>` from reanimated is the animation currency. Adapters that don't have smooth animation can set it to `-1` (hidden) or `0` (shown) immediately. The backdrop/scale system already handles this.

### 3. Backward Compatibility

- `BottomSheetManaged` re-exports `GorhomSheetAdapter`
- `BottomSheetRef` re-exports `SheetAdapterRef`
- All hooks keep the same API
- Users who import `@gorhom/bottom-sheet` continue working unchanged

### 4. Events Simplified to 3 Semantic Signals

Instead of gorhom's `onAnimate(fromIndex, toIndex)` / `onChange(index, position, type)` / `onClose()`, the adapter contract has 3 clear signals:
- `onDismiss()` — user wants to close
- `onOpened()` — fully shown
- `onClosed()` — fully hidden

The gorhom adapter maps gorhom's events to these. The modal adapter maps `onShow`/`onDismiss`/`onRequestClose`.

---

## What Stays gorhom-Specific (in the adapter)

| Feature | How It's Handled |
|---------|-----------------|
| `snapPoints` | Gorhom adapter prop (not in core) |
| `enablePanDownToClose` | Gorhom adapter prop |
| `useBottomSheetSpringConfigs` | Inside gorhom adapter |
| Gesture handling | gorhom handles internally |
| `onAnimate` / `onChange` callbacks | Gorhom adapter translates to `SheetAdapterEvents` |
| `animatedIndex` as snap-point tracker | Gorhom adapter syncs to `animatedRegistry` |

## What the Modal Adapter Handles

| Feature | How It's Handled |
|---------|-----------------|
| `animationType` | Modal adapter prop |
| `presentationStyle` | Modal adapter prop |
| `onRequestClose` | Maps to `handleDismiss()` |
| `onShow` | Maps to `handleOpened()` |
| `onDismiss` | Maps to `handleClosed()` |
| Animation progress | Binary: set `animatedIndex` to -1 or 0 |

---

## Migration Path for Existing Users

1. **No changes required** — `BottomSheetManaged` keeps working
2. **Optional upgrade** — Import `GorhomSheetAdapter` directly for clarity
3. **Add modals** — Import `ModalAdapter` and use it alongside existing sheets
4. **Custom adapters** — Implement `SheetAdapterRef` interface for any UI library

---

## Open Questions / Considerations

1. **Naming**: Should the library be renamed from `react-native-bottom-sheet-stack` to something more generic like `react-native-sheet-stack` or `react-native-overlay-stack`? Or keep the name for SEO/recognition?

2. **react-native-reanimated dependency**: Currently a hard peer dependency. Modal adapter doesn't strictly need it, but the backdrop/scale system does. Keep as required peer dep?

3. **Adapter discovery**: Should adapters be registered globally (provider-level), or purely per-sheet (component-level, as proposed)? Per-sheet is more flexible but means each sheet must explicitly choose an adapter.

4. **Custom backdrop per adapter**: Some adapters (like modals) might want to handle their own backdrop. Should the core backdrop be opt-out per sheet?
