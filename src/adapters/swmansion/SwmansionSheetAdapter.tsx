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

// Lazy require so the main bundle never loads the native module unless this
// adapter is imported (it's an optional peer dependency).
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
 * - `animateIn` — the manager controls the open animation, so this is forced on.
 *
 * Every other native prop (`detents`, `style`, `disableScrollableNegotiation`)
 * is forwarded. The lifecycle callbacks (`onIndexChange`, `onSettle`,
 * `onPositionChange`) are wrapped by the adapter and your handlers are still
 * invoked afterwards.
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
  extends Omit<BottomSheetProps, 'index' | 'modal' | 'animateIn'> {
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
const BACKDROP_FADE_DURATION = 300;
const DEFAULT_HANDLE_COLOR = 'rgba(255, 255, 255, 0.25)';
const DEFAULT_HANDLE_WIDTH = 40;
const DEFAULT_HANDLE_HEIGHT = 4;
const HANDLE_CHROME_TOP = 12;
const HANDLE_CHROME_BOTTOM = 8;
const HANDLE_CHROME_GAP = 8;
// Inset for a custom-element handle, whose height the adapter can't measure
// (matches the default pill's inset: 12 + 4 + 8 + 8).
const CUSTOM_HANDLE_CONTENT_INSET = 32;

function resolveDetentValue(detent: Detent): DetentValue {
  if (typeof detent === 'object' && detent !== null) {
    return detent.value;
  }
  return detent;
}

/**
 * Backdrop target for an open/close transition: a timing toward the endpoint
 * (`0` = open, `-1` = closed). Overridden by the position-coupled fade once the
 * open height is known.
 */
function resolveBackdropTarget(open: boolean): number {
  return withTiming(open ? 0 : -1, { duration: BACKDROP_FADE_DURATION });
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
 * - `onPositionChange` drives the shared `animatedIndex` for a position-coupled
 *   backdrop fade once the open height is known; until then the fade is a timing.
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
      // Disabled by default so the sheet's native scrim doesn't double up with
      // the manager backdrop; consumers can opt in (see the props' Backdrop note).
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

    // A native scrim means this sheet owns its backdrop — suppress the manager's
    // shared one so the two don't stack. The manager backdrop starts invisible
    // behind a short init delay, so toggling it off here causes no flash.
    const usesNativeScrim =
      scrimColor !== 'transparent' || scrimOpacities !== undefined;
    useEffect(() => {
      if (!usesNativeScrim) return;
      setBackdrop(id, false);
      return () => setBackdrop(id, true);
    }, [id, usesNativeScrim, setBackdrop]);

    const detents =
      detentsProp ??
      (fullHeight ? [0, windowHeight - insets.top] : DEFAULT_DETENTS);

    const openIndex = expandedIndex ?? Math.max(0, detents.length - 1);
    const expandedDetentValue = resolveDetentValue(detents[openIndex] ?? 0);

    const handleResult =
      handle && !preventDismiss ? renderHandle(handle) : null;

    const isContentSized = expandedDetentValue === 'content';
    const shouldFill = fillContent ?? !isContentSized;

    // Only clip content to a radius we actually know: the default surface's, or
    // one the consumer states for a custom surface via `cornerRadius`.
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
    // Layer the handle over the (possibly user-provided) surface so the surface
    // stays customizable while the adapter owns the handle.
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

    useBackHandler(id, handleDismiss);

    // Open sheets mount straight at `openIndex` (and animate in) rather than
    // mounting collapsed and waiting for expand() — that round-trip caused
    // intermittent no-op opens. Persistent/hidden sheets mount collapsed.
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

    // Open height (points from the bottom), used to map the native position to a
    // 0→1 backdrop fade. Known for a numeric detent; for `'content'` it's learned
    // from the position at the first open settle.
    const openHeightRef = useRef<number | null>(
      typeof expandedDetentValue === 'number' && expandedDetentValue > 0
        ? expandedDetentValue
        : null
    );
    const lastPositionRef = useRef(0);

    // The initial animate-in emits a collapsed-detent settle before the sheet has
    // ever opened; that one must not be reported as a close (it would dismiss the
    // sheet prematurely and race the open).
    const hasOpenedRef = useRef(false);

    useImperativeHandle(
      ref,
      () => ({
        // An index change always animates, so fade the backdrop toward the
        // target; `onPositionChange` overrides this once the height is known.
        expand: () => {
          animatedIndex.set(resolveBackdropTarget(true));
          setIndex(openIndex);
        },
        close: () => {
          animatedIndex.set(resolveBackdropTarget(false));
          setIndex(0);
        },
      }),
      [animatedIndex, openIndex]
    );

    // Sheets that mount already open have no expand() call, so seed the fade
    // here. Overridden by `onPositionChange` once the height is known.
    useEffect(() => {
      if (defaultIndex >= 0) {
        animatedIndex.set(resolveBackdropTarget(true));
      }
    }, [animatedIndex, defaultIndex]);

    const handleNativeSettle = (settledIndex: number) => {
      // Don't touch `animatedIndex` here: the fade (timing or position-coupled)
      // already reaches the endpoint, and snapping would cut it short.
      if (settledIndex <= 0) {
        if (hasOpenedRef.current) {
          handleClosed();
        }
      } else {
        hasOpenedRef.current = true;
        // Learn the open height so the next move (drag, reopen) is position-coupled.
        if (
          typeof openHeightRef.current !== 'number' &&
          lastPositionRef.current > 0
        ) {
          openHeightRef.current = lastPositionRef.current;
        }
        handleOpened();
      }
      onSettle?.(settledIndex);
    };

    const handleNativeIndexChange = (nextIndex: number) => {
      // onIndexChange fires only for user-driven snaps; reaching `0` means a
      // swipe-down dismiss.
      if (nextIndex <= 0) {
        if (preventDismiss) {
          setIndex(openIndex);
        } else {
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
        const ratio = Math.max(0, Math.min(position / target, 1));
        animatedIndex.set(ratio - 1);
      }
      onPositionChange?.(position);
    };

    // When dismissal is blocked, make the collapsed detent programmatic so the
    // native sheet can't be dragged down to it — `close()` still collapses it via
    // the controlled `index`. The JS re-snap above can't block the native gesture.
    const resolvedDetents = preventDismiss
      ? detents.map((detent, detentIndex) =>
          detentIndex === 0 ? programmatic(resolveDetentValue(detent)) : detent
        )
      : detents;

    const fillStyle = shouldFill ? stylesheet.fill : null;
    const handleInsetStyle = handleResult
      ? { paddingTop: handleResult.contentInset }
      : null;
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
        scrimColor={scrimColor}
        scrimOpacities={scrimOpacities}
        // Managed by the adapter (not overridable):
        index={index}
        modal={false}
        animateIn
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
