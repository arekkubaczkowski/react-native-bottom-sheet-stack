# CLAUDE.md — react-native-bottom-sheet-stack

A library-agnostic stack manager for bottom sheets and modals in React Native.
Sheets come from pluggable adapters; the library owns the stack, the navigation
modes, the backdrop and the iOS-style background scale.

| | |
|---|---|
| React / RN | 19.2.0 / 0.83.10 (New Architecture) |
| State | zustand ^5.0.3 |
| Animation | react-native-reanimated ^4.2.1 |
| Portals | react-native-teleport ^1.1.7 |

| Adapter | Import from | Wraps |
|---------|-------------|-------|
| `CustomModalAdapter` | `react-native-bottom-sheet-stack` | own animated modal, zero deps |
| `GorhomSheetAdapter` | `…/gorhom` | `@gorhom/bottom-sheet` |
| `ReactNativeModalAdapter` | `…/react-native-modal` | `react-native-modal` |
| `ActionsSheetAdapter` | `…/actions-sheet` | `react-native-actions-sheet` |
| `SwmansionSheetAdapter` | `…/swmansion` | `@swmansion/react-native-bottom-sheet` ^1.0 (Fabric) |

---

## No manual memoization

The build runs `babel-plugin-react-compiler` with `panicThreshold: 'all_errors'`.
Do not write `React.memo`, `useMemo` or `useCallback` — the compiler does it, and
hand-rolled memoization fights its analysis.

Three deliberate exceptions, all measured rather than guessed. Do not "clean up"
any of them, and do not add a fourth without the same evidence:

- **`QueueItem.tsx` is wrapped in `memo`.** The compiler memoizes work *inside* a
  component; it cannot stop a parent from calling it. `BottomSheetHost` builds
  children with `.map()`, so every host render produces fresh elements and React
  must call each `QueueItem` — including persistent sheets the opening sheet does
  not touch. Costs no correctness: a changed `stackIndex` still re-renders, and
  `ScaleWrapper` holds its own store subscription.
- **`useStableCallback.ts` uses `useCallback([])`.** Not an optimization — the
  stable identity *is* the feature (the useEvent RFC). Removing it removes the
  hook.
- **`BottomSheetPortal.tsx` carries `'use no memo'`.** It reads the module-global
  refs map (`getSheetRef(id)`) during render. That is not a reactive source, so
  the compiler's re-run analysis is unsound. It works only because
  `portalSession` changes in the same store write that creates the ref.

---

## Store (`store/`)

Split into `store.ts` (actions), `hooks.ts` (selectors), `helpers.ts` (pure stack
operations), `types.ts`.

```ts
interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;
  stackOrderByGroup: Record<string, string[]>;
}
```

**The stack is keyed by group. There is no global `stackOrder`.** Every stack
operation takes one group's array, which makes group isolation structural rather
than a filter each call has to remember. Reaching for
`Object.values(stackOrderByGroup).flat()` in an action or selector reintroduces
the exact bug this shape prevents — `switch`/`replace` in one group closing a
sheet in another.

**Two names, one of them a lie.** `index.tsx` exports `PublicBottomSheetState as
BottomSheetState`. Inside `src/`, `BottomSheetState` is the full internal record;
to a consumer it is a narrowed `Pick` of `id`, `groupId`, `status`, `params`,
`scaleBackground`, `keepMounted`. `content`, `backdrop`, `usePortal`,
`portalSession` and `preventDismiss` are deliberately outside it. Adding a field
to the `Pick` semver-locks it.

`open()` takes a discriminated union, not a bag of flags:

```ts
type OpenPayload =
  | { kind: 'inline'; id; groupId; content: ReactNode; scaleBackground?; params? }
  | { kind: 'portal'; id; groupId; scaleBackground?; params? };
```

`kind` is what callers reason about, `usePortal` is what the renderer checks;
`toStoreFields()` is the only place that maps one to the other. There is no
`kind: 'persistent'` — a persistent sheet is registered by `mount()` and
re-opened as `'portal'`, keeping the `keepMounted` flag it already carries.

Key actions:

- `open(payload, mode?)` → `OpenResult`. Rejects with `'already-active'`,
  `'group-busy'` or `'group-mismatch'`, each with a `__DEV__` warning. Never
  silently drops the request.
- `startClosing(id)` also re-opens the sheet below when the closing one is the
  group's top and the one below is `hidden` — undoing a `switch`.
- `finishClosing(id)` hides if `keepMounted`, removes otherwise.
- `clearGroup` / `clearAll` are teardown: no animation, interceptors skipped.
- `setBackdrop(id, false | true | BackdropConfig)` is the **only** writer of the
  record's `backdrop` field — `open()` never touches it, which is what lets a
  persistent sheet's config survive re-open cycles. `true` means *clear the
  override*, not a stored flag. The action bails on value-equal writes
  (`backdropValuesEqual`): adapters re-apply their `backdrop` prop with a fresh
  object literal on every consumer render, and without the bail each render
  would wake every store subscriber.

**Modes:** `push` keeps the previous sheet visible, `switch` hides it (restored
on close), `replace` closes it.

**Lifecycle:** `hidden` (persistent, pre-mounted) → `opening` → `open` →
`closing` → removed, or back to `hidden` when `keepMounted`.

---

## Coordinator (`bottomSheetCoordinator.ts`)

Store → adapter: subscribes and calls `ref.expand()` on `'opening'`,
`ref.close()` on `'closing'` / `'hidden'`.

Adapter → store: `handleOpened` → `markOpen`, `handleClosed` → `finishClosing`,
and `handleDismiss` → **`requestClose(id)` when an `onBeforeClose` interceptor is
registered**, otherwise `startClosing()` directly. Routing through `requestClose`
is what makes a user gesture honour the interceptor — do not simplify it back.

`driveSheetRef` retries a ref call across up to 10 `requestAnimationFrame`s,
re-checking status each time. The store can reach a terminal status before the
adapter mounts (a portal sheet must teleport first); a single attempt silently
no-ops and wedges the sheet. A sheet stuck at `'closing'` does **not** wedge
later opens in the group — `group-busy` is `'opening'`-only. It costs
`closeAllAnimated` skipping it, `requestClose` answering `not-closable`, no back
handler at all (`useIsTopmostAndOpen` needs `'open'` *and* top) and its own id
answering `already-active` for the rest of the session.

`useAdapterRef` catches up once on mount off the sheet's live status: `'open'` →
`ref.current.expand()`, `'closing'` → `finishClosing(id)`. The coordinator
drives status *changes*, so an adapter that replaces another under a live status
has nobody else to drive it. `'opening'` is left to `driveSheetRef`. A fresh
adapter cannot animate a close it never opened, so `'closing'` is ended in the
store as in `driveSheetRef`'s give-up path — a mid-close remount ends the sheet
without re-animating it out. `'hidden'` is deliberately excluded: a
`switch`-parked sheet sits there *on* the stack and is restored by
`detachFromGroup`, and `mount()` parks every persistent sheet there with its
adapter rendered, so `finishClosing` would delete a live sheet on every
persistent mount.

Also exported publicly for adapter authors: `requestClose(id)` and
`closeAllAnimated(groupId, opts)`.

---

## Module-level registries

Four maps that outlive React, which is why `resetBottomSheetRegistries()` exists.

| Registry | Holds | Non-obvious part |
|---|---|---|
| `refsMap` | adapter refs | Refs are not serializable, so they cannot live in the store. Registered **before** the store write, because that write is what schedules the `QueueItem` render which reads the map. A rejected open reclaims only the entry it created — an orphan is unreclaimable, and deleting a pre-existing one strips a live sheet. Cleaned up by `QueueItem`'s unmount. |
| `animatedRegistry` | `SharedValue<number>` per sheet | Created **eagerly** in `open()` / `mount()` so the backdrop always finds one. `resetAnimatedIndex` rewinds to `-1` on open, so a re-opened persistent sheet does not carry last cycle's value. `getAnimatedIndex` is a pure read and never creates. |
| `onBeforeCloseRegistry` | close interceptors | Found from outside React by `requestClose` / `handleDismiss`. `useOnBeforeClose` registers here and flips `preventDismiss` on the store record in the same **layout** effect: adapters lay themselves out from the flag, so a flag that lands after the first paint moves an opening sheet. The public `setOnBeforeClose` registers without flipping it. |
| `portalSessionRegistry` | monotonic counter per id | Feeds the `Portal`/`PortalHost` name. **Persists across sheet deletion on purpose** — reusing a name after a replace hits a react-native-teleport connection bug. |

---

## Three operating modes

| Mode | Entry point | Context | State | Use for |
|------|-------------|---------|-------|---------|
| Inline | `useBottomSheetManager().open(<JSX/>)` | ✗ | ✗ | one-off, runtime-built sheets |
| Portal | `BottomSheetPortal` + `useBottomSheetControl` | ✓ | ✗ | pre-defined sheets needing Redux/Query/etc. |
| Persistent | `BottomSheetPersistent` + `useBottomSheetControl` | ✓ | ✓ | heavy state — camera, media, long forms |

Portal and persistent both set `usePortal: true`; only persistent sets
`keepMounted`. A persistent sheet stays in `sheetsById` when closed and leaves
only its group's stack.

---

## Public API

```ts
const { open, close, closeAll, closeTo, closeDepth, destroyAll } = useBottomSheetManager();
const { open, close, closeAll, updateParams, resetParams } = useBottomSheetControl('id');
const { id, params, preventDismiss, close, closeAbove, forceClose } = useBottomSheetContext<'id'>();
const { status, isOpen, isOpening, isClosing, isVisible } = useBottomSheetStatus('id');
```

- `open()` returns `string | null` from the manager and `boolean` from the
  control — same rejection, in the currency useful at each call site.
- `close()` respects `onBeforeClose`; `forceClose()` bypasses it; `destroyAll()`
  bypasses it *and* the animation.
- `closeTo(id)` / `closeDepth(n)` / `closeAbove()` close part of the stack. Both
  bounds only move the start later, so neither can widen past the other, and an
  `until` that is not on the group's stack closes **nothing** rather than
  emptying the group.
- **`isOpen` is `'open'` only.** Use `isVisible` for "on screen at all". The
  classic bug is branching on `isOpen` to choose update-vs-open: a second call
  while still `'opening'` takes the open branch and the store rejects it.
- `BottomSheetPortalParams<T>` always unions `| undefined`, because
  `resetParams()` can clear params on an open sheet. Read them with `params?.x`.

Consumers augment `BottomSheetPortalRegistry` for type-safe ids and params.
`HasParams<T>` drives whether `open()` requires `params` and stays unexported —
exporting it would semver-lock a helper that shapes one signature.

---

## Rendering

`BottomSheetHost` renders a `QueueItem` per sheet; `BottomSheetScaleView` wraps
the app content and must be its **sibling**, not its parent.

`QueueItem` z-indexes from `baseZIndex = 100_000_000`, backdrop at
`base + stackIndex * 2` and content at `+ 1`. The even/odd pairing keeps a
backdrop below its own sheet but above the one beneath. The offset lifts the
whole stack above arbitrary app chrome — without it any host view with a modest
`zIndex` paints over the sheets.

`BottomSheetHost` takes `SheetWrapper?: ComponentType<SheetWrapperProps>`;
`QueueItem` renders it around an inline sheet's `content`, inside
`BottomSheetContext`, with `getSheetRef(id)` as `sheetRef`. The render-time
registry read is sound because `open()` registers the ref and then writes the
store in one synchronous call, and the store write only *schedules* the render
that mounts the item — the item's first render already sees the final entry,
which it must, because the compiler caches the read on `id` and never re-runs
it. An inline id is minted per open and the item's unmount cleanup removes it,
so the value cannot change while the item is mounted; the read is guarded on
`usePortal` because a persistent id *can* be re-registered under a
still-mounted item. A caller-supplied inline id re-opened in the same tick as
its removal keeps one ref object: `open()` reuses whatever is registered for the
id, so the wrapper and the coordinator hold the same ref. The prop *value*
must be stable for the life of the host: it is the element type, so a new value
remounts every inline sheet (replayed open animation, a stateful wrapper's state
gone). A derived value (`flag ? Wrapper : undefined`) breaks it even under the
compiler, which outlines a capture-free inline arrow — hence a dev warning on
change, not just a "module scope" line in the JSDoc.

`BottomSheetBackdrop` is mounted from the sheet's first frame and faded purely by
`animatedIndex`. Do not add a timer or delay gate: deferring the mount drops the
opening frames the adapter already drove, and the backdrop pops in mid-fade.

The backdrop's *look* is configurable (`BackdropConfig`, a `kind: 'styled' |
'custom'` union): group default via `backdrop` on the provider, per sheet
via the `backdrop` prop on the adapter (routed through `useAdapterBackdrop` →
`setBackdrop`). Resolution is **atomic for the visual choice** — a sheet-level
config replaces the group's rendering entirely; only `pressToDismiss` resolves
per field, and styles compose (`[default, group, sheet]`) when both levels are
`styled`. The adapter prop lands via effect a beat after the backdrop first
mounts, so it is applied in a *layout* effect: `animatedIndex` starts at `-1`,
which holds a `styled` backdrop at zero opacity for that frame, but a `custom`
one owns its own fade and would otherwise paint at full strength before the
sheet's config replaced it. The guarantee is structural for `styled` and
contractual for `custom`. A `kind: 'custom'` component owns its own fade
off `animatedIndex` — the built-in opacity is deliberately not applied on top.

Two selectors read the field, and the split is deliberate: `QueueItem` takes
`useSheetBackdropEnabled` (a boolean — "render one at all") so restyling does
not re-render the memoized sheet layer, and only `BottomSheetBackdrop` takes the
config through `useSheetBackdrop`.

Every shipped adapter exposes `backdrop?: BackdropConfig | false` (via the
shared `AdapterBackdropProps`) and, where its library draws an overlay of its
own, forces that overlay off. Re-exposing the underlying prop would let a
second, non-stack-aware overlay paint over the manager's — gorhom's
`backdropComponent` still is exposed, deprecated, and suppresses the manager's
backdrop so the two never stack.

Two deprecated paths write the same field and must not fight: `open({ backdrop })`
writes through `setBackdrop` after the store accepts the open, so
`useAdapterBackdrop` only writes when the adapter actually carries a `backdrop`
prop. An adapter that never sets one has no opinion to state — clearing
unconditionally would wipe the option's value on the next commit.

`useSheetRenderData` orders hidden persistent sheets before active ones so React
does not unmount and remount across transitions.

---

## Scale animation

`ScaleConfig` is `{ scale = 0.92, translateY = 10, borderRadius = 12, animation }`.
Depth compounds: `scale ** depth`.

Two depth hooks, and they do different things:

- **`useBackgroundScaleDepth(groupId)`** — for `BottomSheetScaleView`. Walks the
  group's stack from the bottom, finds the first sheet that is not `closing` or
  `hidden`, and returns *that sheet's* `scaleBackground` as `1` or `0`. It stops
  there: it does **not** count all scaling sheets. Binary on purpose — the app
  background scales once however deep the stack goes.
- **`useSheetScaleDepth(groupId, sheetId)`** — counts live `scaleBackground`
  sheets strictly above a sheet, so nested sheets cascade.

`useSheetScaleDepth` returns `null` once the sheet leaves the stack and the
caller holds the last known depth **in an effect, not the selector**: a zustand
selector runs on every store change (twice per render under StrictMode), so a ref
write inside it would make the result depend on how often it ran.

An empty style is returned at depth 0 — an identity transform on the first frame
collapses layout in RN 0.85's animation backend.

Public exports are the style hooks: `useBackgroundScaleAnimatedStyle()` and
`useSheetScaleAnimatedStyle(sheetId)`.

---

## Writing an adapter

Public so a third-party adapter reaches parity with the shipped ones:

| Hook | Purpose |
|---|---|
| `useAdapterRef(forwardedRef)` | resolves the ref context (portal/persistent) or the forwarded one (inline) |
| `useAnimatedIndex()` | the sheet's shared value, `-1` hidden → `0` visible |
| `useBackHandler(id, onBackPress)` | registered only while the sheet is open **and** topmost in its own group |
| `useAdapterBackdrop(id, backdrop)` | applies the adapter's `backdrop?: BackdropConfig \| false` prop; two effects on purpose — value-sync (store bails on equal) and unmount-clear — so fresh JSX literals don't clear-and-rewrite every render |
| `useSetBackdrop()` | imperative form: `false` suppresses the shared backdrop (adapter draws its own), config restyles it, `true` clears |
| `useSheetPreventDismiss(id)` | whether an interceptor is blocking, so native gestures can be disabled |

**Drive `animatedIndex` continuously.** Setting it discretely in expand/close
snaps the backdrop to full opacity a whole animation ahead of the sheet.

Adapters must call `handleDismiss` on user-initiated dismissal, `handleOpened`
when the show animation ends and `handleClosed` when the hide animation ends.

### SwmansionSheetAdapter constraints

- Native `scrimColor` and a detent's `scrimOpacity` are modal-only. The manager
  always renders inline, so they can never paint — the adapter does not accept
  them. Use the `backdrop` prop (`false` to disable).
- `fullHeight` passes a detent taller than any screen and lets native clamp it.
  Do **not** recompute `windowHeight - insets.top` in JS: there is no
  JS-provided cap, and a JS estimate ignores that the sheet lives inside the
  manager's `QueueItem` layer.
- `topInset` is resolved in JS and applied as an offset of the host, with native
  `topInset={0}`. The native default follows where the host sits in the window,
  and an ancestor transform (the background scale) moves that mid-animation.
- `detached` is native detent `insets` plus a four-corner radius in
  `surfaceStyle`. Do not bring back a JS margin box or a JS clip: the gaps must
  stay outside the sheet, so a touch there reaches the backdrop.
- `lazy` is forced off. It unmounts the content at the closed detent, which is
  where a persistent sheet rests between opens.
- Corners belong in `surfaceStyle`, which clips the surface and the content
  natively — never on the `surface` element or a content wrapper. A radius the
  consumer sets in `surfaceStyle` wins: the adapter then adds none, because
  upstream resolves a specific corner ahead of `borderRadius`.

### The swmansion bridge

The native sheet is controlled through `index` and reports back through
`onIndexChange` (user snaps) and `onSettle` (any animation's end). The adapter
holds these rules:

1. The `index` prop always holds the last detent anyone chose: the adapter's own
   drives and every user snap.
2. It never passes an index outside `0 … detents.length - 1` — upstream throws
   during render. A `detents` prop that shrinks takes the index with it.
3. A drive to the detent native already rests on is answered by the adapter:
   native emits no settle for an index it already holds. "Rests on" is two
   refs — the target native was last told or told us, and the detent it last
   settled on — decided synchronously, because an `expand()` and a `close()`
   in one React batch collapse to no prop change.
4. A settle on an open detent reports opened.
5. A settle on the closed detent finishes the sheet **only under `closing`**.
   Under `open` or `opening` the store never agreed to close — an interceptor
   declined or is still deciding, or the settle predates a later open — so the
   adapter returns the index to the open detent. Under `hidden` it does nothing.
6. The widened `onIndexChange(openIndex, 0)` is announced once per open.

---

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- zustand: `shallow` for object selectors, `subscribeWithSelector` for the
  coordinator subscription. Never put refs in the store.
- Reanimated worklets for animation; `useAnimatedStyle` for animated components.
- Comments explain *why*, and only where the reason is not visible in the code.

---

## Testing

`yarn test`; suites in `src/__tests__/`.

```ts
import { resetBottomSheetRegistries } from 'react-native-bottom-sheet-stack/testing';
beforeEach(resetBottomSheetRegistries);
```

One call clears the store and every registry, so it cannot go stale as
registries are added. Without it a test inherits the previous one's sheets.

**Reanimated and react-native-teleport are mocked in `jest.setup.ts`.** The store
and coordinator only use shared values as somewhere to put a number, and the
portal components as plumbing. A test that genuinely needs their behaviour should
unmock at its own scope.

**Frames are driven by hand.** `driveSheetRef` retries across
`requestAnimationFrame` and the tests care how many frames elapse, so
`coordinatorSync.test.ts` stubs it with an explicit queue. Fake timers couple the
test to how rAF is polyfilled, and `await` inside a fake-timer loop deadlocks.

**Adapter suites record the native sheet.** `swmansionAdapter.test.tsx` mocks
the library with a component that pushes its props to a recorder and renders
`surface` and `children`, then drives `onSettle` / `onIndexChange` by hand.
Test components go at module scope: inside `it()` the compiler outlines them
and they lose what they captured. `swmansionKeyboardInset.test.tsx` loads each
peer state in its own module registry (`jest.resetModules()` + `jest.doMock`),
because the module decides at import whether the peer is usable.

**Write the test so it fails without the fix.** Group isolation is the sharp
case: asserting on a single sheet in the untouched group misses a leak that
writes to the *other* group's stack, so assertions compare the whole
`stackOrderByGroup`. Confirm a regression test fails against unfixed code before
trusting it.

---

## Subpath exports

Adapters with third-party dependencies ship as separate subpath exports so the
main entry never triggers a Metro resolution error for a library the consumer did
not install.

```ts
import { BottomSheetManagerProvider } from 'react-native-bottom-sheet-stack';
import { GorhomSheetAdapter } from 'react-native-bottom-sheet-stack/gorhom';
```

There is deliberately **no `adapters/index.ts` barrel** — a barrel imports every
adapter, which is the exact error the subpaths exist to avoid.

`CustomModalAdapter`'s props type is exported as **`ModalAdapterProps`**. The
component was renamed, the type was not; changing it needs a major bump.

The example app aliases the subpaths in its own `babel.config.js` because RNBB's
module-resolver would otherwise prefix-match them into `src/index.tsx/gorhom`.
Consumer apps need nothing — Metro reads `exports` from package.json.

---

## Pitfalls

1. Do not memoize by hand — three sanctioned exceptions, listed above.
2. Do not put refs in the store; use `refsMap`.
3. Do not flatten `stackOrderByGroup`.
4. Sheets need a `BottomSheetHost`; `BottomSheetScaleView` must be its sibling.
5. Sheet ids are globally unique — a cross-group open is rejected as
   `'group-mismatch'`.
6. `open()` on an already-open sheet is a no-op; use `updateParams()` or close it
   first.
7. Do not export third-party adapters from `src/index.tsx`.
8. Do not set `animatedIndex` discretely in an adapter.
9. Do not branch on `isOpen` for "is it on screen" — use `isVisible`.
10. Do not read `params` without `?.`.
11. Do not drop `setBackdrop`'s value-equality bail, and do not subscribe
    `QueueItem` to the backdrop *config* — both turn one consumer render into a
    store write that re-renders the whole sheet layer.
12. A new adapter must not expose its library's own backdrop prop. The manager
    renders the one backdrop; a second overlay stacks and is not stack-aware.
    Gorhom's `backdropComponent` is the one exception, kept deprecated for
    back-compat — do not copy the pattern.
13. A controlled adapter must answer a drive to the position it already holds.
    The library stays silent for it, and the sheet then waits at `opening` or
    `closing` for a settle that never comes.
