import React, {
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withTiming } from 'react-native-reanimated';

import type {
  BottomSheetProps,
  Detent,
  DetentValue,
} from '@swmansion/react-native-bottom-sheet';

import type { SheetAdapterRef } from '../../adapter.types';
import {
  useSetBackdrop,
  useSheetPreventDismiss,
} from '../../bottomSheet.store';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetDefaultIndex } from '../../BottomSheetDefaultIndex.context';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBackHandler } from '../../useBackHandler';
import { useBottomSheetContext } from '../../useBottomSheetContext';
import { SwmansionKeyboardInset } from './SwmansionKeyboardInset';

// Loaded lazily so the main bundle never requires the native module unless
// this adapter is actually imported (it ships as an optional peer dependency).
const { BottomSheet, programmatic } =
  require('@swmansion/react-native-bottom-sheet') as typeof import('@swmansion/react-native-bottom-sheet');

export { programmatic } from '@swmansion/react-native-bottom-sheet';
export type { Detent, DetentValue };

/**
 * Style overrides for the adapter-rendered grab handle (the default pill).
 *
 * For total control over the rendering, pass a custom React element to the
 * `handle` prop instead of this config.
 */
export interface SwmansionHandleConfig {
  /** Color of the grab-handle pill. Defaults to a translucent light gray. */
  color?: string;
  /** Width of the pill in px. Defaults to `40`. */
  width?: number;
  /** Height (thickness) of the pill in px. Defaults to `4`. */
  height?: number;
}

/**
 * Props for {@link SwmansionSheetAdapter}.
 *
 * Forwards the full prop surface of `@swmansion/react-native-bottom-sheet`'s
 * `BottomSheet` component, except for the props the stack manager owns:
 *
 * - `index` — the adapter is the source of truth for the snap index because the
 *   manager drives open/close imperatively. Use {@link expandedIndex} to pick
 *   which detent the sheet expands to.
 * - `modal` — the sheet always renders inline inside the manager's `QueueItem`
 *   layer so its z-index participates in the stack and the manager's shared
 *   `BottomSheetBackdrop` provides the scrim.
 *
 * Every other native prop (`detents`, `style`, `animateIn`,
 * `disableScrollableNegotiation`) is forwarded. The lifecycle callbacks
 * (`onIndexChange`, `onSettle`, `onPositionChange`) are wrapped by the adapter
 * and your handlers are still invoked afterwards.
 *
 * **Backdrop.** By default the manager renders its own shared, stack-aware
 * `BottomSheetBackdrop` and the native scrim is disabled (`scrimColor` defaults
 * to `'transparent'`). You *can* opt into the native swmansion scrim by passing
 * `scrimColor` / `scrimOpacities` — but it's **not recommended**: the manager
 * backdrop is aware of the whole stack (correct opacity across stacked sheets,
 * z-index layering, scale coordination, cascading tap-to-dismiss), which a
 * per-sheet native scrim is not. When you do pass a scrim, the adapter
 * automatically disables the manager backdrop for this sheet so the two never
 * stack into a double-dark overlay.
 *
 * On top of the native surface the adapter layers a set of **opt-in
 * conveniences** ({@link handle}, {@link fullHeight}, {@link fillContent},
 * {@link keyboardBehavior}, {@link cornerRadius}). Each defaults to off (or to
 * the native default), so a bare `<SwmansionSheetAdapter>` behaves like the raw
 * native sheet.
 */
export interface SwmansionSheetAdapterProps
  extends Omit<BottomSheetProps, 'index' | 'modal'> {
  /**
   * Index into `detents` the sheet expands to when opened.
   *
   * Defaults to the last detent. The detent at index `0` must resolve to `0`
   * (collapsed) — this matches the library's default `detents` of
   * `[0, 'content']` and is what the manager snaps back to when closing.
   */
  expandedIndex?: number;
  /**
   * Renders a grab handle as a chrome layer on top of the `surface`, and insets
   * the content so it clears the handle. Accepts:
   *
   * - `true` — the default pill.
   * - `{ color, width, height }` — the default pill with style overrides.
   * - a React element — rendered as-is at the top of the surface (full control);
   *   the content is given a default top inset, override it with your own
   *   padding if your handle is taller.
   *
   * Automatically hidden when dismissal is blocked (`useOnBeforeClose`) — a
   * non-draggable sheet showing a grab handle would mislead. Defaults to off
   * (no handle), so raw usage is unaffected.
   */
  handle?: boolean | SwmansionHandleConfig | ReactElement;
  /**
   * Expands the sheet to the full available height — the window height minus the
   * top safe-area inset.
   *
   * Why this exists when `detents` already sets height: swmansion detents are
   * only `number | 'content'`, so a full-height sheet needs a concrete pixel
   * value (screen height minus the notch/status-bar inset). This prop computes
   * it for you — safe-area- and rotation-aware — so you don't wire up
   * `useWindowDimensions` / `useSafeAreaInsets` and the arithmetic yourself, and
   * you express intent ("fill the screen") instead of a magic number.
   *
   * Ignored when explicit `detents` are passed — those win. Defaults to off.
   */
  fullHeight?: boolean;
  /**
   * Stretches the content to fill the sheet's height (`flex: 1` on the content
   * wrapper).
   *
   * A fixed-height sheet has a known height, but its content sizes to itself by
   * default — so a `flex: 1` scrollable collapses instead of filling the sheet,
   * and a footer meant for the bottom floats up under the content. Filling makes
   * scrollables expand and footers pin to the bottom.
   *
   * Auto by default and rarely set by hand: `true` for fixed-height sheets
   * (numeric `detents` or {@link fullHeight}), `false` for content-sized sheets
   * (the `'content'` detent) — which must not fill, or they couldn't size to
   * their content. Pass a boolean only to override this.
   */
  fillContent?: boolean;
  /**
   * Keyboard avoidance for the sheet's content. The native swmansion sheet has
   * none of its own, so a `TextInput` near the bottom would sit under the
   * keyboard.
   *
   * - `'none'` (default) — no avoidance; the raw native behavior.
   * - `'inset'` — keeps a content-sized sheet's inputs above the keyboard.
   *   Because the sheet is bottom-anchored and sizes to its content, padding the
   *   content by the keyboard height re-measures the sheet taller and lifts the
   *   content clear of the keyboard (the added strip hides behind it) — matching
   *   native iOS. No-op for fixed-height sheets (numeric `detents` /
   *   {@link fullHeight}): they can't grow, so put a scrollable inside and let it
   *   scroll the focused input into view instead.
   *
   * `'inset'` reads the keyboard height from the optional peer
   * `react-native-keyboard-controller`. If it isn't installed the sheet renders
   * without avoidance (a one-time dev warning is logged) — it never crashes.
   */
  keyboardBehavior?: 'none' | 'inset';
  /**
   * Top corner radius (px), applied to the default surface and used to clip the
   * content so opaque top content can't square off the corners. Pass `0` for a
   * flat top. Defaults to the built-in surface radius; with a custom `surface`,
   * clipping is off unless you set this to match its radius.
   */
  cornerRadius?: number;
}

const DEFAULT_DETENTS: Detent[] = [0, 'content'];
const DEFAULT_SURFACE_RADIUS = 20;
// Backdrop fade used on the first open, before the open height is known (so the
// position-coupled fade can't run yet). Matches the modal adapter's timing.
const BACKDROP_FADE_DURATION = 300;
const DEFAULT_HANDLE_COLOR = 'rgba(255, 255, 255, 0.25)';
const DEFAULT_HANDLE_WIDTH = 40;
const DEFAULT_HANDLE_HEIGHT = 4;
// Chrome padding around the pill, plus a gap before the content begins.
const HANDLE_CHROME_TOP = 12;
const HANDLE_CHROME_BOTTOM = 8;
const HANDLE_CHROME_GAP = 8;
// Top inset given to the content for a custom-element handle, whose height the
// adapter can't measure (matches the default pill's inset: 12 + 4 + 8 + 8).
const CUSTOM_HANDLE_CONTENT_INSET = 32;

function resolveDetentValue(detent: Detent): DetentValue {
  if (typeof detent === 'object' && detent !== null) {
    return detent.value;
  }
  return detent;
}

/**
 * Target `animatedIndex` for an open/close transition that the position-coupled
 * fade can't drive (open height not yet known): a timing toward the endpoint, or
 * an instant set when the sheet doesn't animate. `0` = open, `-1` = closed.
 */
function resolveBackdropTarget(open: boolean, animate: boolean): number {
  const target = open ? 0 : -1;
  return animate
    ? withTiming(target, { duration: BACKDROP_FADE_DURATION })
    : target;
}

/**
 * Builds the grab-handle overlay (rendered over the surface) and the top inset
 * the content needs to clear it. `handle` is already known to be truthy.
 */
function renderHandle(handle: boolean | SwmansionHandleConfig | ReactElement): {
  overlay: ReactNode;
  contentInset: number;
} {
  if (isValidElement(handle)) {
    return {
      overlay: <View style={stylesheet.customHandleContainer}>{handle}</View>,
      contentInset: CUSTOM_HANDLE_CONTENT_INSET,
    };
  }

  const config: SwmansionHandleConfig =
    typeof handle === 'object' ? handle : {};
  const width = config.width ?? DEFAULT_HANDLE_WIDTH;
  const height = config.height ?? DEFAULT_HANDLE_HEIGHT;
  const color = config.color ?? DEFAULT_HANDLE_COLOR;

  return {
    overlay: (
      <View pointerEvents="none" style={stylesheet.handleContainer}>
        <View
          style={[
            stylesheet.handleIndicator,
            { width, height, backgroundColor: color },
          ]}
        />
      </View>
    ),
    contentInset:
      HANDLE_CHROME_TOP + height + HANDLE_CHROME_BOTTOM + HANDLE_CHROME_GAP,
  };
}

/**
 * Adapter for [`@swmansion/react-native-bottom-sheet`](https://github.com/software-mansion-labs/react-native-bottom-sheet).
 *
 * Software Mansion's bottom sheet is a fully *controlled* Fabric component: it
 * has no imperative ref and its position is driven entirely by the `index`
 * prop. This adapter bridges that controlled model onto the stack manager's
 * imperative `SheetAdapterRef` contract:
 *
 * - `expand()` → moves `index` to {@link SwmansionSheetAdapterProps.expandedIndex}.
 * - `close()`  → moves `index` back to `0` (collapsed).
 * - `onSettle` reports completed animations → `handleOpened` / `handleClosed`.
 * - `onIndexChange` (user-driven only) reaching `0` → `handleDismiss`.
 * - `onPositionChange` drives the shared `animatedIndex` for a smooth backdrop
 *   fade once the open height is known; the first open of a content-sized sheet
 *   (height not yet known) fades the backdrop with a timing instead.
 *
 * It also layers opt-in conveniences over the native sheet — a grab handle,
 * full-height/fill-content sizing, and keyboard avoidance — each off by default
 * so raw usage is unchanged. See {@link SwmansionSheetAdapterProps}.
 *
 * Requires the New Architecture and the peer dependencies:
 * ```bash
 * npm install @swmansion/react-native-bottom-sheet react-native-safe-area-context
 * ```
 */
export const SwmansionSheetAdapter = React.forwardRef<
  SheetAdapterRef,
  SwmansionSheetAdapterProps
>(
  (
    {
      children,
      detents: detentsProp,
      expandedIndex,
      animateIn = true,
      // The manager renders its own shared `BottomSheetBackdrop`; the sheet's
      // native scrim would double up with it, so it is disabled by default.
      // Consumers can still opt into the native scrim by passing these (see the
      // backdrop note on `SwmansionSheetAdapterProps`).
      scrimColor = 'transparent',
      scrimOpacities,
      onIndexChange,
      onSettle,
      onPositionChange,
      surface,
      handle,
      fullHeight,
      fillContent,
      keyboardBehavior = 'none',
      cornerRadius,
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);
    const setBackdrop = useSetBackdrop();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // Opting into the native scrim means this sheet owns its backdrop, so
    // suppress the manager's shared one — otherwise the two stack into a
    // double-dark overlay. The manager backdrop starts at opacity 0 behind a
    // short init delay, so toggling it off here is invisible (no flash).
    const usesNativeScrim =
      scrimColor !== 'transparent' || scrimOpacities !== undefined;
    useEffect(() => {
      if (!usesNativeScrim) return;
      setBackdrop(id, false);
      return () => setBackdrop(id, true);
    }, [id, usesNativeScrim, setBackdrop]);

    // Explicit `detents` always win; otherwise `fullHeight` derives a numeric
    // open detent, falling back to the content-sized default.
    const detents =
      detentsProp ??
      (fullHeight ? [0, windowHeight - insets.top] : DEFAULT_DETENTS);

    const openIndex = expandedIndex ?? Math.max(0, detents.length - 1);
    const expandedDetentValue = resolveDetentValue(detents[openIndex] ?? 0);

    // Hide the grab handle when dismissal is blocked — the sheet can't be
    // swiped down, so a handle would mislead.
    const handleResult =
      handle && !preventDismiss ? renderHandle(handle) : null;

    // A fixed-height sheet lets the content flex to fill it, so scrollables bind
    // and footers pin to the bottom. Content-detent sheets stay natural so they
    // size to their content. The heuristic is overridable via `fillContent`.
    const isContentSized = expandedDetentValue === 'content';
    const shouldFill = fillContent ?? !isContentSized;

    // The default surface owns its radius; a custom surface owns its own, so we
    // only clip content to a known radius (default, or one the consumer states
    // via `cornerRadius`).
    const usingDefaultSurface = surface === undefined || surface === null;
    const surfaceRadius =
      cornerRadius ?? (usingDefaultSurface ? DEFAULT_SURFACE_RADIUS : 0);

    const baseSurface = surface ?? (
      <View
        style={[
          StyleSheet.absoluteFill,
          stylesheet.surface,
          {
            borderTopLeftRadius: surfaceRadius,
            borderTopRightRadius: surfaceRadius,
          },
        ]}
      />
    );
    // Layer the grab handle over the (possibly user-provided) surface so the
    // surface stays fully customizable while the adapter owns the handle.
    const composedSurface = handleResult ? (
      <View style={StyleSheet.absoluteFill}>
        {baseSurface}
        {handleResult.overlay}
      </View>
    ) : (
      baseSurface
    );

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    // Android hardware back dismisses the top, fully-open sheet — the same
    // contract the other adapters honor.
    useBackHandler(id, handleDismiss);

    // Mount directly at the index the manager wants instead of mounting
    // collapsed and waiting for the coordinator to call expand(). Open sheets
    // (defaultIndex >= 0) mount at `openIndex` so the native animates straight in
    // to the open detent — there is no post-mount expand() round-trip to race
    // against (which previously caused intermittent no-op opens and, once the
    // spurious-close was suppressed, a stuck `opening` status). Persistent/hidden
    // sheets (defaultIndex < 0) mount collapsed and are expanded on demand.
    const defaultIndex = useBottomSheetDefaultIndex();
    const [index, setIndex] = useState(() =>
      defaultIndex < 0 ? 0 : openIndex
    );

    if (__DEV__ && resolveDetentValue(detents[0] ?? 0) !== 0) {
      console.warn(
        '[SwmansionSheetAdapter] The first detent should resolve to 0 ' +
          '(collapsed) so the sheet can close. Received: ' +
          JSON.stringify(detents[0])
      );
    }

    // Open height, used to turn the native position (points from the bottom)
    // into a 0→1 backdrop-fade progress. Known up front for a numeric expanded
    // detent; for a `'content'` detent it's unknown until the sheet first opens,
    // so it's learned from the position at the first open settle.
    const openHeightRef = useRef<number | null>(
      typeof expandedDetentValue === 'number' && expandedDetentValue > 0
        ? expandedDetentValue
        : null
    );
    const lastPositionRef = useRef(0);

    // The native sheet animates in to its mounted index (0 = collapsed) and
    // emits a settle at that detent before the coordinator drives expand(). That
    // initial settle must NOT be reported as a close, otherwise the sheet is
    // finished/removed before it ever opens — racing expand() and making opens
    // (especially stacked pushes) intermittently no-op.
    const hasOpenedRef = useRef(false);

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          // Position-coupling needs the open height; until it's known the
          // backdrop is driven by a timing (instant when not animating).
          if (typeof openHeightRef.current !== 'number') {
            animatedIndex.set(resolveBackdropTarget(true, animateIn));
          }
          setIndex(openIndex);
        },
        close: () => {
          if (typeof openHeightRef.current !== 'number') {
            animatedIndex.set(resolveBackdropTarget(false, animateIn));
          }
          setIndex(0);
        },
      }),
      [animateIn, animatedIndex, openIndex]
    );

    // Inline/portal sheets mount already at the open index and animate in via
    // the native `animateIn` — there's no `expand()` call to kick the fade. When
    // such a sheet mounts open with an unknown height, drive the backdrop here
    // the same way. Numeric detents are seeded, so they keep the position-coupled
    // fade and skip this. Runs once on mount.
    useEffect(() => {
      if (defaultIndex >= 0 && typeof openHeightRef.current !== 'number') {
        animatedIndex.set(resolveBackdropTarget(true, animateIn));
      }
    }, [animateIn, animatedIndex, defaultIndex]);

    const handleNativeSettle = (settledIndex: number) => {
      // When the height is known the position-coupled fade already reached the
      // endpoint, so settling just confirms it. When a timed fade owns the
      // transition (height unknown + animating), DON'T snap — it would cut the
      // timing short. A non-animated sheet has no fade to protect, so snap.
      const confirmEndpoint =
        typeof openHeightRef.current === 'number' || !animateIn;
      if (settledIndex <= 0) {
        if (confirmEndpoint) {
          animatedIndex.set(-1);
        }
        // Ignore the collapsed-detent settle that fires during the initial
        // animate-in (before the sheet has ever opened). A real close only
        // happens after an open, so reporting it here would dismiss the sheet
        // prematurely and race expand().
        if (hasOpenedRef.current) {
          handleClosed();
        }
      } else {
        hasOpenedRef.current = true;
        if (confirmEndpoint) {
          animatedIndex.set(0);
        } else if (lastPositionRef.current > 0) {
          // First animated open of a content-sized sheet: learn the open height
          // so the next move (drag-to-dismiss, reopen) is position-coupled. The
          // timed fade kicked on open owns this animation — don't snap.
          openHeightRef.current = lastPositionRef.current;
        }
        handleOpened();
      }
      onSettle?.(settledIndex);
    };

    const handleNativeIndexChange = (nextIndex: number) => {
      // onIndexChange fires only for user-driven snaps. Reaching the collapsed
      // detent means the user swiped the sheet down to dismiss it.
      if (nextIndex <= 0) {
        if (preventDismiss) {
          // Re-snap up: dismissal is blocked for this sheet.
          setIndex(openIndex);
        } else {
          // Keep the controlled index in sync with the native position so a
          // later expand() is a real 0 → openIndex transition.
          setIndex(0);
          handleDismiss();
        }
      }
      onIndexChange?.(nextIndex);
    };

    const handleNativePositionChange = (position: number) => {
      lastPositionRef.current = position;
      const target = openHeightRef.current;
      if (target && target > 0) {
        // animatedIndex range: -1 (closed) → 0 (open).
        const ratio = Math.max(0, Math.min(position / target, 1));
        animatedIndex.set(ratio - 1);
      }
      // While the open height is unknown (first open of a `'content'` sheet), the
      // backdrop is driven by the timing kicked in `expand()`/`close()` instead.
      onPositionChange?.(position);
    };

    // When dismissal is blocked, mark the collapsed detent (index 0) as
    // programmatic so the native sheet cannot be dragged down to it. This is the
    // native equivalent of "prevent pan-to-close" — `close()` still collapses it
    // via the controlled `index`. The JS re-snap in `handleNativeIndexChange`
    // alone cannot block the native gesture.
    const resolvedDetents = preventDismiss
      ? detents.map((detent, detentIndex) =>
          detentIndex === 0 ? programmatic(resolveDetentValue(detent)) : detent
        )
      : detents;

    // Wrap the content only when a convenience needs it, so raw sheets pass
    // their children straight through with no extra view in the tree.
    const fillStyle = shouldFill ? stylesheet.fill : null;
    const handleInsetStyle = handleResult
      ? { paddingTop: handleResult.contentInset }
      : null;
    // Clip content to the surface's rounded top so opaque content can't square
    // off the corners. The content layer sits on top of the surface and isn't
    // otherwise bounded by its radius.
    const clipStyle: ViewStyle | null =
      surfaceRadius > 0
        ? {
            overflow: 'hidden',
            borderTopLeftRadius: surfaceRadius,
            borderTopRightRadius: surfaceRadius,
          }
        : null;
    const needsKeyboardInset = keyboardBehavior === 'inset' && !shouldFill;

    let content = children;
    if (needsKeyboardInset) {
      content = (
        <SwmansionKeyboardInset
          style={[fillStyle, handleInsetStyle, clipStyle]}
        >
          {children}
        </SwmansionKeyboardInset>
      );
    } else if (fillStyle || handleInsetStyle || clipStyle) {
      content = (
        <View style={[fillStyle, handleInsetStyle, clipStyle]}>{children}</View>
      );
    }

    return (
      <BottomSheet
        {...props}
        detents={resolvedDetents}
        animateIn={animateIn}
        // Off by default (manager owns the backdrop); overridable to opt into
        // the native scrim.
        scrimColor={scrimColor}
        scrimOpacities={scrimOpacities}
        // Managed by adapter (not overridable):
        index={index}
        modal={false}
        onIndexChange={handleNativeIndexChange}
        onSettle={handleNativeSettle}
        onPositionChange={handleNativePositionChange}
        surface={composedSurface}
      >
        {content}
      </BottomSheet>
    );
  }
);

SwmansionSheetAdapter.displayName = 'SwmansionSheetAdapter';

const stylesheet = StyleSheet.create({
  surface: {
    backgroundColor: '#151521',
  },
  handleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: HANDLE_CHROME_TOP,
    paddingBottom: HANDLE_CHROME_BOTTOM,
  },
  customHandleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  handleIndicator: {
    borderRadius: 999,
  },
  fill: {
    flex: 1,
  },
});
