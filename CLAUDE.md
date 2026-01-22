# CLAUDE.md - LLM Guide for react-native-bottom-sheet-stack

## CRITICAL: React Compiler - NO MANUAL MEMOIZATION

**This project uses React Compiler (`babel-plugin-react-compiler` v1.0.0) with React 19.**

### DO NOT USE:
- `React.memo()`
- `useMemo()`
- `useCallback()`
- `memo()` HOC
- Any manual memoization patterns

### WHY:
React Compiler automatically handles all memoization at build time. Manual memoization is:
1. **Redundant** - Compiler does it better
2. **Harmful** - Can conflict with compiler optimizations
3. **Unnecessary** - Compiler tracks dependencies automatically

### Babel Configuration (babel.config.js):
```javascript
plugins: [
  ['babel-plugin-react-compiler', {
    target: '19',
    panicThreshold: 'all_errors',  // Strict mode
  }],
]
```

### When Compiler Cannot Optimize:
Use the `'use no memo'` directive at the top of the file (see `BottomSheetPortal.tsx` for example). This is RARE and only needed when:
- Dynamic ref cloning breaks compiler analysis
- External library integration requires it

---

## Project Overview

A sophisticated stack manager for bottom sheets built on `@gorhom/bottom-sheet`. Provides:
- **Navigation modes**: push, switch, replace
- **iOS-style scale animations**: Background content scales when sheets open
- **Context preservation**: Via portals (`react-native-teleport`)
- **Persistent sheets**: Pre-mounted sheets that maintain state across open/close cycles
- **Type-safe APIs**: TypeScript with augmentable type registry

### Tech Stack
| Category | Package | Version |
|----------|---------|---------|
| React | react | 19.1.0 |
| React Native | react-native | 0.81.5 |
| Bottom Sheet | @gorhom/bottom-sheet | ^5.2.8 |
| Animation | react-native-reanimated | ^4.2.1 |
| State | zustand | ^5.0.3 |
| Portals | react-native-teleport | ^0.5.6 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BottomSheetManagerProvider                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PortalProvider                         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │          BottomSheetManagerContext                  │  │   │
│  │  │  (groupId, scaleConfig)                            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────┐
│  BottomSheetScaleView │                 │   BottomSheetHost   │
│  (wraps app content)  │                 │   (renders sheets)  │
└─────────────────────┘                 └─────────────────────┘
                                                   │
                    ┌──────────────────────────────┴──────────────────────────────┐
                    ▼                              ▼                              ▼
          ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
          │    QueueItem    │          │    QueueItem    │          │    QueueItem    │
          │  (sheet slot)   │          │  (sheet slot)   │          │  (sheet slot)   │
          │   zIndex: 0,1   │          │   zIndex: 2,3   │          │   zIndex: 4,5   │
          └─────────────────┘          └─────────────────┘          └─────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ PortalHost      │   │ Inline Content  │
│ (portal mode)   │   │ (dynamic mode)  │
└─────────────────┘   └─────────────────┘
```

---

## Source File Guide (`src/`)

### Core State Management

#### `bottomSheet.store.ts` - Central Zustand Store
**Purpose**: Single source of truth for all sheet state and stack ordering.

**State Structure**:
```typescript
interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;  // All sheets by ID
  stackOrder: string[];                           // Visible sheet IDs in order
}

interface BottomSheetState {
  groupId: string;              // Manager group ID
  id: string;                   // Unique sheet ID
  content?: ReactNode;          // For inline mode only
  status: BottomSheetStatus;    // 'opening' | 'open' | 'closing' | 'hidden'
  scaleBackground?: boolean;    // Enable iOS-style scale
  usePortal?: boolean;          // Portal mode flag
  params?: Record<string, unknown>;  // Type-safe params
  keepMounted?: boolean;        // Persistent sheet flag
}
```

**Key Actions**:
- `open(sheet, mode)` - Opens sheet with navigation mode
- `markOpen(id)` - Transitions 'opening' → 'open'
- `startClosing(id)` - Initiates close animation
- `finishClosing(id)` - Completes close (hides if keepMounted, removes otherwise)
- `mount(sheet)` - Pre-mounts persistent sheet with 'hidden' status
- `unmount(id)` - Removes persistent sheet

**Navigation Modes** (`OpenMode`):
- `push` - Keeps previous sheet visible (stacking)
- `switch` - Hides previous sheet (hidden status, not removed)
- `replace` - Closes previous sheet (closing status, then removed)

#### `bottomSheetCoordinator.ts` - State↔UI Synchronization
**Purpose**: Bidirectional sync between Zustand store and gorhom bottom sheet.

**Two Directions**:
1. **Store → Gorhom** (`initBottomSheetCoordinator`):
   - Subscribes to store changes
   - Calls `ref.expand()` when status becomes 'opening'
   - Calls `ref.close()` when status becomes 'hidden' or 'closing'

2. **Gorhom → Store** (`createSheetEventHandlers`):
   - `handleAnimate`: User swipes down → `startClosing()`
   - `handleChange`: Animation completes → `markOpen()`
   - `handleClose`: Sheet fully closed → `finishClosing()`

### Global Registries (Module-Level Maps)

#### `refsMap.ts` - Sheet Reference Registry
```typescript
const sheetRefsMap = new Map<string, RefObject<BottomSheetMethods>>();
```
**Why**: Refs cannot be stored in Zustand (not serializable). Global map allows coordinator to access refs by sheet ID.

#### `animatedRegistry.ts` - Animated Index Registry
```typescript
const animatedIndexRegistry = new Map<string, SharedValue<number>>();
```
**Why**: Shared animated values for backdrop opacity interpolation. Created lazily via `getAnimatedIndex(id)`.

### Components

#### `BottomSheetManagerProvider.tsx` - Root Provider
Wraps app with:
- `PortalProvider` (from react-native-teleport)
- `BottomSheetManagerContext` (groupId, scaleConfig)

#### `BottomSheetHost.tsx` - Sheet Queue Renderer
**Purpose**: Renders active sheets from store.
**Responsibilities**:
- Initializes coordinator subscription
- Clears group on unmount
- Renders QueueItems for each sheet

#### `QueueItem.tsx` - Individual Sheet Slot
**Purpose**: Single sheet rendering with proper z-index layering.

**Z-Index Strategy**:
```typescript
const backdropZIndex = stackIndex * 2;     // Even numbers: 0, 2, 4...
const contentZIndex = stackIndex * 2 + 1;  // Odd numbers: 1, 3, 5...
```
This ensures backdrop always renders below its sheet's content.

**Rendering Modes**:
- **Portal Mode** (`usePortal: true`): Renders `<PortalHost>` that receives content from `BottomSheetPortal`
- **Inline Mode** (`usePortal: false`): Renders content directly with `BottomSheetContext.Provider`

#### `BottomSheetManaged.tsx` - Gorhom Sheet Wrapper
**Purpose**: Wraps `@gorhom/bottom-sheet` with coordinator integration.

**Key Features**:
- Auto-wires event handlers to coordinator
- Reads status from store to control `index` prop
- Uses `useBottomSheetSpringConfigs` for smooth animations
- Supports both forwarded ref and context ref

#### `BottomSheetPortal.tsx` - Portal Mode Sheet Definition
**Uses `'use no memo'` directive** - Compiler cannot optimize due to dynamic ref cloning.

**Purpose**: Defines portal-based sheet content. Renders into PortalHost in QueueItem.
**When to use**: When sheet needs access to parent React context (Redux, custom contexts, etc.)

#### `BottomSheetPersistent.tsx` - Pre-Mounted Persistent Sheet
**Purpose**: Sheet that stays mounted even when closed.

**Lifecycle**:
1. On mount: `mount()` action creates sheet with `status: 'hidden'`, `keepMounted: true`
2. On open: Store moves to stack, status → 'opening'
3. On close: Status → 'hidden' (NOT removed from sheetsById)
4. On unmount: `unmount()` action removes from store

**Use Case**: Sheets with heavy state (forms, media players) that need to preserve state.

#### `BottomSheetScaleView.tsx` - Background Scale Animation
**Purpose**: Wraps app content to apply iOS-style scale animation.
**Note**: Must be sibling to `BottomSheetHost`, not parent.

#### `BottomSheetBackdrop.tsx` - Custom Backdrop
**Purpose**: Animated backdrop with opacity based on sheet's animatedIndex.
**Key**: Only interactive when status is 'open' (prevents animation conflicts).

### Hooks

#### `useBottomSheetManager.tsx` - Dynamic Sheet Opening
**Purpose**: Imperative API for opening sheets with content.

```typescript
const { open, close, clear } = useBottomSheetManager();

// Open with inline content (content cloned with ref)
const id = open(<MySheet />, { mode: 'push', scaleBackground: true });
close(id);
```

**When to use**: Opening sheets dynamically with content as parameter.

#### `useBottomSheetControl.ts` - Portal Sheet Control
**Purpose**: Type-safe control for portal-based sheets.

```typescript
const { open, close, updateParams } = useBottomSheetControl('user-sheet');

open({ params: { userId: '123' } });
updateParams({ userId: '456' });
```

**When to use**: Controlling pre-defined portal sheets with type-safe params.

#### `useBottomSheetContext.ts` - Sheet Internal Context
**Purpose**: Access current sheet's ID and params from within the sheet.

```typescript
// Inside a sheet component
const { id, params, close } = useBottomSheetContext<'user-sheet'>();
```

#### `useBottomSheetStatus.ts` - Sheet Status Monitoring
**Purpose**: Observe sheet status from outside the sheet.

**Works with all sheet types**: Portal, persistent, and inline sheets.

```typescript
// Portal/persistent sheet (registered ID)
const { status, isOpen } = useBottomSheetStatus('user-sheet');

// Inline sheet (dynamic ID from useBottomSheetManager)
const { open } = useBottomSheetManager();
const sheetId = open(<MySheet />);
// Later...
const { status, isOpen } = useBottomSheetStatus(sheetId);
```

#### `useScaleAnimation.ts` - Scale Animation Logic
**Purpose**: Calculates scale animation values based on sheet depth.

**Key Concept - Power Scaling**:
```typescript
const currentScale = Math.pow(scale, depth);  // e.g., 0.92^1 = 0.92, 0.92^2 = 0.85
```
Creates cascading scale effect for nested sheets.

**useScaleDepth**: Returns number of `scaleBackground: true` sheets above current position.

#### `useSheetRenderData.ts` - Render Order Logic
**Purpose**: Determines which sheets to render and in what order.

**Render Order**:
1. Hidden persistent sheets (keepMounted=true, not in stack)
2. Active sheets (in stackOrder)

This prevents React from unmounting/remounting during state transitions.

#### `useEvent.ts` - Stable Callback Utility
**Purpose**: RFC useEvent implementation - stable function identity with latest closure.

**Usage**: Used in `BottomSheetPersistent` for mount callback.

### Context Files

#### `BottomSheet.context.ts`
Provides current sheet ID to children. Used by `useBottomSheetContext`.

#### `BottomSheetManager.context.tsx`
Provides groupId and scaleConfig to all components within a manager.

#### `BottomSheetRef.context.ts`
Passes sheet ref from Persistent/Portal to Managed without user intervention.

### Type Definitions

#### `portal.types.ts` - Type-Safe Portal Registry
**Purpose**: Enables type-safe sheet IDs and params via module augmentation.

```typescript
// In your app:
declare module 'react-native-bottom-sheet-stack' {
  interface BottomSheetPortalRegistry {
    'simple-sheet': true;                    // No params
    'user-sheet': { userId: string };        // With params
  }
}
```

**Key Types**:
- `BottomSheetPortalId` - Union of registered sheet IDs (or `string` if no registry)
- `BottomSheetPortalParams<T>` - Params type for specific sheet ID
- `HasParams<T>` - Boolean type for param requirement checking

---

## Sheet Lifecycle States

```
                    mount() (persistent only)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        'hidden'                              │
│  (persistent sheets only - not rendered, but in sheetsById) │
└─────────────────────────────────────────────────────────────┘
                           │
                     open() action
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       'opening'                              │
│  (coordinator calls ref.expand(), animation starting)        │
└─────────────────────────────────────────────────────────────┘
                           │
              handleChange(index >= 0)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         'open'                               │
│  (fully visible, interactive)                                │
└─────────────────────────────────────────────────────────────┘
                           │
         startClosing() (user swipe or API call)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       'closing'                              │
│  (coordinator calls ref.close(), animation running)          │
└─────────────────────────────────────────────────────────────┘
                           │
                    handleClose()
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│ keepMounted=true │              │ keepMounted=false│
│   → 'hidden'     │              │   → REMOVED      │
└──────────────────┘              └──────────────────┘
```

---

## Three Operating Modes

This library provides three distinct ways to use bottom sheets. Each mode has different trade-offs:

| Mode | Component | Context Preserved | State Preserved | Use Case |
|------|-----------|-------------------|-----------------|----------|
| **Inline** | `useBottomSheetManager` | No | No | Dynamic, one-off sheets |
| **Portal** | `BottomSheetPortal` | Yes | No | Pre-defined sheets needing context |
| **Persistent** | `BottomSheetPersistent` | Yes | Yes | Heavy state sheets (forms, media) |

---

### 1. Inline Mode (Dynamic Content)

**Component**: `useBottomSheetManager` hook
**Flags**: `usePortal: false`, `keepMounted: false`

```tsx
const { open, close } = useBottomSheetManager();

// Open with inline content
const id = open(
  <BottomSheetManaged snapPoints={['50%']}>
    <DynamicContent data={someData} />
  </BottomSheetManaged>,
  { scaleBackground: true, mode: 'push' }
);

// Close by ID
close(id);
```

**Data Flow**:
1. `useBottomSheetManager.open()` clones content with ref attached
2. Content stored in `sheetsById[id].content`
3. `QueueItem` renders content directly with `BottomSheetContext.Provider`
4. On close: Sheet removed from store entirely

**Characteristics**:
- Content passed as JSX parameter at runtime
- Sheet unmounted on close (state lost)
- No access to parent React context (Redux, etc.)
- Random ID generated if not provided

**Use When**:
- Sheet content determined at runtime
- Quick confirmation dialogs, alerts
- No need for parent context access
- State doesn't need to persist

---

### 2. Portal Mode (Context Preservation)

**Component**: `BottomSheetPortal`
**Flags**: `usePortal: true`, `keepMounted: false`

```tsx
// 1. Define sheet at declaration site (near context providers)
<BottomSheetPortal id="user-sheet">
  <BottomSheetManaged snapPoints={['50%']}>
    <UserSheetContent />  {/* Has access to parent contexts! */}
  </BottomSheetManaged>
</BottomSheetPortal>

// 2. Control from anywhere
const { open, close, updateParams } = useBottomSheetControl('user-sheet');

open({ params: { userId: '123' }, scaleBackground: true });
updateParams({ userId: '456' });
close();
```

**Data Flow**:
1. `BottomSheetPortal` defines content at declaration site (renders `<Portal>`)
2. Content stays in React tree where declared (context preserved)
3. `QueueItem` provides `<PortalHost>` when sheet is in stack
4. `react-native-teleport` teleports content into PortalHost
5. On close: Sheet removed from store (content unmounts)

**Characteristics**:
- Content defined once, controlled imperatively
- Sheet unmounted on close (state lost)
- Full access to parent React context
- Type-safe params via registry augmentation
- Uses `'use no memo'` directive (React Compiler exception)

**Use When**:
- Sheet needs Redux, React Query, or custom context
- Sheet ID and structure known at compile time
- Type-safe params desired
- State doesn't need to persist across open/close

---

### 3. Persistent Mode (State Preservation)

**Component**: `BottomSheetPersistent`
**Flags**: `usePortal: true`, `keepMounted: true`

```tsx
// 1. Define persistent sheet (content stays mounted!)
<BottomSheetPersistent id="scanner-sheet">
  <BottomSheetManaged snapPoints={['90%']}>
    <ScannerWithHeavyState />  {/* State preserved across close/open! */}
  </BottomSheetManaged>
</BottomSheetPersistent>

// 2. Control from anywhere
const { open, close } = useBottomSheetControl('scanner-sheet');

open({ scaleBackground: true });
// User interacts, builds up state...
close();
// State is NOT lost!
open();  // Reopens with previous state intact
```

**Data Flow**:
1. On component mount: `mount()` action creates sheet with `status: 'hidden'`
2. Sheet exists in `sheetsById` but NOT in `stackOrder`
3. On `open()`: Sheet added to `stackOrder`, status → 'opening'
4. On close: Status → 'hidden', removed from `stackOrder` but KEPT in `sheetsById`
5. Content stays mounted (just hidden), state preserved
6. On component unmount: `unmount()` removes from store completely

**Lifecycle Diagram**:
```
Component Mount → store.mount() → status: 'hidden' (in sheetsById, not in stackOrder)
                                         │
                                   open() called
                                         │
                                         ▼
                             status: 'opening' (added to stackOrder)
                                         │
                                   animation done
                                         │
                                         ▼
                                  status: 'open'
                                         │
                                  close() called
                                         │
                                         ▼
                              status: 'closing' → 'hidden'
                              (removed from stackOrder, kept in sheetsById)
                              Content stays mounted! State preserved!
                                         │
                                   open() again
                                         │
                                         ▼
                             status: 'opening' (same content, same state)
```

**Characteristics**:
- Content stays mounted even when sheet is closed
- Full state preservation (form inputs, scroll position, media playback)
- Full access to parent React context
- Uses own `useRef` for sheet reference (not createRef)
- Re-mounts automatically if cleared by `clearGroup()` during fast refresh

**Use When**:
- Heavy initialization (camera, media player, complex forms)
- User expects to return to same state
- Performance-critical (avoid remount cost)
- Long-lived sheets opened/closed frequently

---

### Mode Comparison: Store State

```
INLINE MODE (useBottomSheetManager):
┌─────────────────────────────────────────────────────┐
│ sheetsById: { 'abc123': { content: <JSX>, ... } }   │
│ stackOrder: ['abc123']                              │
└─────────────────────────────────────────────────────┘
After close: Sheet DELETED from sheetsById

PORTAL MODE (BottomSheetPortal):
┌─────────────────────────────────────────────────────┐
│ sheetsById: { 'user-sheet': { usePortal: true } }   │
│ stackOrder: ['user-sheet']                          │
└─────────────────────────────────────────────────────┘
After close: Sheet DELETED from sheetsById

PERSISTENT MODE (BottomSheetPersistent):
┌──────────────────────────────────────────────────────────────────┐
│ sheetsById: { 'scanner': { usePortal: true, keepMounted: true } }│
│ stackOrder: ['scanner']                                          │
└──────────────────────────────────────────────────────────────────┘
After close: Sheet KEPT in sheetsById with status: 'hidden'
             Removed from stackOrder only
```

---

### Choosing the Right Mode

```
                    ┌─────────────────────────────┐
                    │ Need parent React context?  │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
                   NO                            YES
                    │                             │
                    ▼                             ▼
          ┌─────────────────┐      ┌─────────────────────────┐
          │  INLINE MODE    │      │ Need state preservation │
          │ useBottomSheet- │      │   across open/close?    │
          │    Manager      │      └───────────┬─────────────┘
          └─────────────────┘                  │
                                  ┌────────────┴────────────┐
                                  │                         │
                                 NO                        YES
                                  │                         │
                                  ▼                         ▼
                        ┌─────────────────┐      ┌─────────────────┐
                        │  PORTAL MODE    │      │ PERSISTENT MODE │
                        │ BottomSheet-    │      │ BottomSheet-    │
                        │    Portal       │      │   Persistent    │
                        └─────────────────┘      └─────────────────┘
```

---

## Scale Animation System

### Configuration

```typescript
interface ScaleConfig {
  scale?: number;        // Default: 0.92 (scale factor per depth level)
  translateY?: number;   // Default: 10 (vertical shift per depth level)
  borderRadius?: number; // Default: 12 (corner radius when scaled)
  animation?: ScaleAnimationConfig;  // Timing or spring
}

type ScaleAnimationConfig =
  | { type: 'timing'; config?: WithTimingConfig }
  | { type: 'spring'; config?: WithSpringConfig };
```

### How It Works

1. **Depth Calculation** (`useScaleDepth`):
   - Counts sheets with `scaleBackground: true` above current position
   - For `BottomSheetScaleView`: Counts all scaleBackground sheets (binary 0 or 1)
   - For sheets: Counts scaleBackground sheets above it in stack

2. **Power Scaling**:
   ```typescript
   currentScale = scale^depth      // e.g., 0.92^2 = 0.8464
   currentTranslateY = translateY * depth
   currentBorderRadius = min(borderRadius * depth, borderRadius)
   ```

3. **Animation**:
   - `useDerivedValue` computes animated progress
   - `useAnimatedStyle` applies transforms

---

## Group Isolation

Multiple `BottomSheetManagerProvider` instances can run independently:

```tsx
<BottomSheetManagerProvider id="main-group">
  {/* Main app sheets */}
</BottomSheetManagerProvider>

<BottomSheetManagerProvider id="modal-group">
  {/* Modal-specific sheets */}
</BottomSheetManagerProvider>
```

Each group:
- Has its own stackOrder
- Sheets filtered by groupId in coordinator
- `clearGroup(groupId)` clears only that group

---

## Code Conventions

### TypeScript
- Strict mode enabled
- `noUncheckedIndexedAccess: true` - Always check map/array access
- `verbatimModuleSyntax: true` - Explicit `type` imports

### Zustand Patterns
- Use `shallow` comparison for object selectors
- Use `subscribeWithSelector` for coordinator subscription
- Never store refs in store (use global maps instead)

### Animation Patterns
- Use `react-native-reanimated` worklets
- Shared values via `makeMutable()` for global access
- `useAnimatedStyle` for animated components

### Ref Handling
- Global refs map instead of context drilling
- `createRef` for dynamic sheets
- `useRef` for persistent sheets

---

## Testing Utilities

```typescript
import { __resetSheetRefs, __resetAnimatedIndexes } from 'react-native-bottom-sheet-stack';

beforeEach(() => {
  __resetSheetRefs();
  __resetAnimatedIndexes();
});
```

---

## Common Patterns

### Opening a Sheet with Scale

```typescript
// Portal mode
const { open } = useBottomSheetControl('my-sheet');
open({ scaleBackground: true });

// Inline mode
const { open } = useBottomSheetManager();
open(<MySheet />, { scaleBackground: true });
```

### Updating Sheet Params

```typescript
const { updateParams, resetParams } = useBottomSheetControl('user-sheet');

// Update
updateParams({ userId: newId });

// Reset to undefined
resetParams();
```

### Accessing Params Inside Sheet

```typescript
function UserSheet() {
  const { params, close } = useBottomSheetContext<'user-sheet'>();
  // params is typed as { userId: string } | undefined
}
```

### Navigation Modes

```typescript
// Push: Stack sheets (both visible)
open({ mode: 'push' });

// Switch: Hide previous, show new (can restore)
open({ mode: 'switch' });

// Replace: Close previous, show new (cannot restore)
open({ mode: 'replace' });
```

---

## File Structure Summary

```
src/
├── index.tsx                    # Public exports
├── bottomSheet.store.ts         # Zustand store (state + actions)
├── bottomSheetCoordinator.ts    # Store ↔ Gorhom sync
├── refsMap.ts                   # Global sheet refs registry
├── animatedRegistry.ts          # Global animated values registry
├── portal.types.ts              # Type-safe portal registry types
│
├── BottomSheetManager.provider.tsx  # Root provider component
├── BottomSheetManager.context.tsx   # Manager context definition
├── BottomSheet.context.ts           # Sheet context definition
├── BottomSheetRef.context.ts        # Ref context definition
│
├── BottomSheetHost.tsx          # Sheet queue renderer
├── QueueItem.tsx                # Individual sheet slot
├── BottomSheetManaged.tsx       # Gorhom wrapper component
├── BottomSheetPortal.tsx        # Portal mode definition ('use no memo')
├── BottomSheetPersistent.tsx    # Persistent sheet component
├── BottomSheetScaleView.tsx     # Background scale wrapper
├── BottomSheetBackdrop.tsx      # Custom backdrop component
│
├── useBottomSheetManager.tsx    # Dynamic sheet opening hook
├── useBottomSheetControl.ts     # Portal sheet control hook
├── useBottomSheetContext.ts     # Sheet internal context hook
├── useBottomSheetStatus.ts      # External status monitoring hook
├── useScaleAnimation.ts         # Scale animation hooks
├── useSheetRenderData.ts        # Render order computation hook
└── useEvent.ts                  # Stable callback utility
```

---

## Dependencies Graph

```
@gorhom/bottom-sheet ──────┐
                           │
react-native-reanimated ───┼──▶ BottomSheetManaged
                           │         │
react-native-gesture-handler        │
                                    ▼
zustand ─────────────────────▶ bottomSheet.store
                                    │
                                    ▼
react-native-teleport ────────▶ BottomSheetPortal
                               BottomSheetPersistent
                               QueueItem (PortalHost)
                                    │
                                    ▼
react-native-safe-area-context ─▶ QueueItem (useSafeAreaFrame)
```

---

## Pitfalls to Avoid

1. **DO NOT memoize** - React Compiler handles it
2. **DO NOT store refs in Zustand** - Use refsMap instead
3. **DO NOT forget `BottomSheetHost`** - Sheets won't render without it
4. **DO NOT nest `BottomSheetScaleView` around `BottomSheetHost`** - They must be siblings
5. **DO NOT use same sheet ID in multiple groups** - IDs must be globally unique
6. **DO NOT call `open()` on already-open sheet** - It's a no-op by design
