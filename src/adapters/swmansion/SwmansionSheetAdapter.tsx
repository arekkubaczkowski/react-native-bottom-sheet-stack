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
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useEvent } from 'react-native-reanimated';

import type {
  BottomSheetProps,
  Detent,
  DetentValue,
  PositionChangeEventData,
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
 * - `onPositionChange` / `wrapNativeView` — the adapter consumes these to drive
 *   the backdrop fade on the UI thread (via a Reanimated worklet), so they are
 *   not forwarded.
 *
 * Every other native prop (`detents`, `style`, `disableScrollableNegotiation`)
 * is forwarded. The `onIndexChange` / `onSettle` callbacks are wrapped by the
 * adapter and your handlers are still invoked afterwards.
 *
 * **`onIndexChange`.** Wider than the native prop: the adapter also fires it for
 * the programmatic open it drives (at animation start), so you get an immediate
 * open signal (e.g. haptics) — `onSettle` only reports the end. It also receives
 * the previous index as a second argument — `(nextIndex, prevIndex)` — while the
 * first argument keeps the native meaning (the index being moved to).
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
  extends Omit<
    BottomSheetProps,
    | 'index'
    | 'modal'
    | 'animateIn'
    | 'onPositionChange'
    | 'wrapNativeView'
    | 'onIndexChange'
  > {
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
   * Keyboard avoidance for the sheet's content.
   *
   * - `'none'` (default) — the content owns the keyboard (use a keyboard-aware
   *   scrollable inside).
   * - `'inset'` — the sheet insets its content by the keyboard height (content
   *   must be a plain scrollable/view; don't also nest a keyboard-aware one).
   *
   * `'inset'` needs the optional peer `react-native-keyboard-controller`; without
   * it the sheet renders without avoidance. See the
   * Keyboard avoidance guide for when to use which.
   */
  keyboardBehavior?: 'none' | 'inset';
  /**
   * Top corner radius (px), applied to the default surface and used to clip the
   * content so opaque top content can't square off the corners. Pass `0` for a
   * flat top. Defaults to the built-in surface radius; with a custom `surface`,
   * clipping is off unless you set this to match its radius.
   */
  cornerRadius?: number;
  /**
   * Called when the sheet's snap index changes.
   *
   * Wider than the native prop in two ways:
   * - It also fires for the programmatic open the manager drives (at animation
   *   start), so you get an immediate open signal (e.g. haptics) — native
   *   `onIndexChange` skips programmatic changes and `onSettle` only reports the
   *   end of the animation.
   * - It receives the **previous** index as a second argument, so you can tell
   *   the direction of a change without tracking it yourself.
   *
   * The first argument keeps the native semantics (the index the sheet is moving
   * to), so handlers that read only it are unaffected.
   *
   * @param nextIndex The index the sheet is moving to (same as the native prop's
   *   single argument).
   * @param prevIndex The index the sheet was at before this change.
   */
  onIndexChange?: (nextIndex: number, prevIndex: number) => void;
}

const DEFAULT_DETENTS: Detent[] = [0, 'content'];
const DEFAULT_SURFACE_RADIUS = 20;
const DEFAULT_HANDLE_COLOR = 'rgba(255, 255, 255, 0.25)';
const DEFAULT_HANDLE_WIDTH = 40;
const DEFAULT_HANDLE_HEIGHT = 4;
const HANDLE_CHROME_TOP = 12;
const HANDLE_CHROME_BOTTOM = 8;
const HANDLE_CHROME_GAP = 8;

const CUSTOM_HANDLE_CONTENT_INSET = 32;

function resolveDetentValue(detent: Detent): DetentValue {
  if (typeof detent === 'object' && detent !== null) {
    return detent.value;
  }
  return detent;
}

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
 * - `onIndexChange` (user-driven) reaching `0` → `handleDismiss`; the adapter also
 *   emits `onIndexChange(openIndex, prevIndex)` for the programmatic open it
 *   drives, and forwards the previous index as the second argument on every call.
 * - `onPositionChange` drives the shared `animatedIndex` straight from the native
 *   fractional detent `index`, so the backdrop fades with the sheet on open,
 *   close, and drag-to-dismiss — no JS-side position normalization.
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

    const defaultIndex = useBottomSheetDefaultIndex();
    const [index, setIndex] = useState(() =>
      defaultIndex < 0 ? 0 : openIndex
    );

    // Last index seen, mirrored on every move — supplies `prevIndex` to
    // `onIndexChange`. The `index` state only swings between 0 and `openIndex`,
    // so it can't track snaps between non-zero detents.
    const lastIndexRef = useRef(index);

    if (__DEV__ && resolveDetentValue(detents[0] ?? 0) !== 0) {
      console.warn(
        '[SwmansionSheetAdapter] The first detent should resolve to 0 ' +
          '(collapsed) so the sheet can close. Received: ' +
          JSON.stringify(detents[0])
      );
    }

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          // Native onIndexChange skips programmatic changes; surface the open at
          // animation start (onSettle only reports the end).
          const prevIndex = lastIndexRef.current;
          lastIndexRef.current = openIndex;
          onIndexChange?.(openIndex, prevIndex);
          setIndex(openIndex);
        },
        close: () => {
          // No emission (native is silent for programmatic moves), but keep the
          // tracker in sync so the next open sees 0 as its previous index.
          lastIndexRef.current = 0;
          setIndex(0);
        },
      }),
      [openIndex, onIndexChange]
    );

    const handleNativeSettle = (settledIndex: number) => {
      if (settledIndex <= 0) {
        handleClosed();
      } else {
        handleOpened();
      }
      onSettle?.(settledIndex);
    };

    const handleNativeIndexChange = (nextIndex: number) => {
      const prevIndex = lastIndexRef.current;
      lastIndexRef.current = nextIndex;
      if (nextIndex <= 0) {
        if (preventDismiss) {
          setIndex(openIndex);
        } else {
          setIndex(0);
          handleDismiss();
        }
      }
      onIndexChange?.(nextIndex, prevIndex);
    };

    const onPositionChange = useEvent<
      NativeSyntheticEvent<PositionChangeEventData>
    >(
      (event) => {
        'worklet';
        animatedIndex.set(event.index - 1);
      },
      ['onPositionChange']
    );

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
    // Applies to every sheet size: a content-sized sheet re-measures taller, a
    // fixed-height one (carries `fillStyle`) shrinks its scroll area instead.
    const needsKeyboardInset = keyboardBehavior === 'inset';

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
        wrapNativeView={Animated.createAnimatedComponent}
        onIndexChange={handleNativeIndexChange}
        onSettle={handleNativeSettle}
        onPositionChange={onPositionChange}
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
