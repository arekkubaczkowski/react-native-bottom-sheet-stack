import React, {
  isValidElement,
  type ReactElement,
  type ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  type NativeSyntheticEvent,
  StyleSheet,
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

import type {
  AdapterBackdropProps,
  SheetAdapterRef,
} from '../../adapter.types';
import { useBottomSheetDefaultIndex } from '../../BottomSheetDefaultIndex.context';
import { useSheetPreventDismiss } from '../../store';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterBackdrop } from '../../useAdapterBackdrop';
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
 * - `animateIn` — the manager controls the open animation, so this is forced on.
 * - `onPositionChange` / `wrapNativeView` — the adapter consumes these to drive
 *   the backdrop fade on the UI thread (via a Reanimated worklet), so they are
 *   not forwarded.
 *
 * - `extendUnderStatusBar` — still accepted, but the adapter implements it by
 *   offsetting the sheet host rather than by letting the native side subtract
 *   the status-bar overlap, so a scaled ancestor cannot shift the sheet.
 *
 * Every other native prop (`detents`, `style`, `surface`,
 * `animateContentHeight`, `disableScrollableNegotiation`) is forwarded. The
 * `onIndexChange` / `onSettle` callbacks are wrapped by the adapter and your
 * handlers are still invoked afterwards.
 *
 * **`onIndexChange`.** Wider than the native prop: the adapter also fires it for
 * the programmatic open it drives (at animation start), so you get an immediate
 * open signal (e.g. haptics) — `onSettle` only reports the end. It also receives
 * the previous index as a second argument — `(nextIndex, prevIndex)` — while the
 * first argument keeps the native meaning (the index being moved to).
 *
 * **Backdrop.** The manager renders its own shared, stack-aware
 * `BottomSheetBackdrop`, faded from the sheet's live native position. The native
 * swmansion scrim is not an option here: it is gated on `modal` sheets, and the
 * manager always renders inline inside its `QueueItem` layer so the sheet's
 * z-index participates in the stack. Use the {@link backdrop} prop to restyle
 * or replace it, or `backdrop={false}` for no backdrop at all.
 *
 * On top of the native surface the adapter layers a set of **opt-in
 * conveniences** ({@link handle}, {@link fullHeight}, {@link fillContent},
 * {@link detached}, {@link keyboardBehavior}, {@link cornerRadius}). Each
 * defaults to off (or to the native default), so a bare
 * `<SwmansionSheetAdapter>` behaves like the raw native sheet.
 */
export interface SwmansionSheetAdapterProps
  extends AdapterBackdropProps,
    Omit<
      BottomSheetProps,
      | 'index'
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
   * Expands the sheet to the full height available to it.
   *
   * Why this exists when `detents` already sets height: swmansion detents are
   * `number | 'content'`, and neither expresses "as tall as you can go" — a
   * `'content'` detent sizes to the content, and a fixed number is a magic
   * value that has to be recomputed per device. This passes a detent taller
   * than any screen, which the native side clamps to the height it actually
   * measured for the sheet, so you express intent instead of arithmetic.
   *
   * The cap keeps the sheet below the status bar unless you also pass
   * `extendUnderStatusBar`. Combined with {@link detached}, "full height" means
   * the detached frame's height — the insets are subtracted first.
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
   * Floats the sheet free of the screen edges instead of anchoring it to the
   * bottom — the "detached" presentation from `@gorhom/bottom-sheet`.
   *
   * The insets become margins on the sheet's own content, so the card hangs off
   * the sheet's top edge and travels with it: it enters from below the screen
   * and leaves the same way, rather than growing in place above a fixed gap.
   * All four corners are rounded rather than just the top two, and a
   * `'content'` detent measures the card plus its margins, so heights stay
   * correct without any arithmetic on your side.
   *
   * Defaults to off. When on, the insets default to `16` horizontally and the
   * bottom safe-area inset (at least `16`) vertically, so a bare `detached`
   * clears the home indicator.
   */
  detached?: boolean;
  /**
   * Gap between the bottom of the sheet and the bottom of the screen, in px.
   *
   * Only meaningful with {@link detached}. Defaults to the bottom safe-area
   * inset, but at least `16`.
   */
  bottomInset?: number;
  /**
   * Gap between the sheet and each side of the screen, in px.
   *
   * Only meaningful with {@link detached}. Defaults to `16`.
   */
  horizontalInset?: number;
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
   * Corner radius (px), applied to the default surface and used to clip the
   * content so opaque top content can't square off the corners. Rounds the top
   * two corners, or all four when {@link detached}. Pass `0` for flat corners.
   * Defaults to the built-in surface radius; with a custom `surface`, clipping
   * is off unless you set this to match its radius.
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

const DEFAULT_DETACHED_INSET = 16;

// Taller than any screen. Native clamps `points` detents to the height it
// measured, so this resolves to the available height on any device.
const FULL_HEIGHT_DETENT = 1_000_000;

function resolveDetentValue(detent: Detent): DetentValue {
  if (typeof detent === 'object' && detent !== null) {
    return detent.value;
  }
  return detent;
}

/**
 * Whether the detent at `index` is the collapsed one.
 *
 * The manager treats "settled on a zero-height detent" as closed.
 */
function isClosedDetent(detents: Detent[], index: number): boolean {
  const detent = detents[index];
  if (detent === undefined) {
    return index <= 0;
  }
  return resolveDetentValue(detent) === 0;
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
 * - `close()`  → moves `index` back to the collapsed detent.
 * - `onSettle` reports completed animations → `handleOpened` / `handleClosed`.
 * - `onIndexChange` (user-driven) reaching a zero-height detent → `handleDismiss`;
 *   the adapter also emits `onIndexChange(openIndex, prevIndex)` for the
 *   programmatic open it drives, and forwards the previous index as the second
 *   argument on every call.
 * - `onPositionChange` drives the shared `animatedIndex` straight from the native
 *   fractional detent `index`, so the backdrop fades with the sheet on open,
 *   close, and drag-to-dismiss — no JS-side position normalization.
 *
 * It also layers opt-in conveniences over the native sheet — a grab handle,
 * full-height/fill-content sizing, a detached (floating) presentation, and
 * keyboard avoidance — each off by default so raw usage is unchanged. See
 * {@link SwmansionSheetAdapterProps}.
 *
 * Requires the New Architecture, `@swmansion/react-native-bottom-sheet >= 0.16`,
 * and the peer dependencies:
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
      backdrop,
      detents: detentsProp,
      expandedIndex,
      onIndexChange,
      onSettle,
      style,
      surface,
      handle,
      fullHeight,
      fillContent,
      detached,
      bottomInset,
      horizontalInset,
      keyboardBehavior = 'none',
      cornerRadius,
      extendUnderStatusBar = false,
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);
    const insets = useSafeAreaInsets();
    useAdapterBackdrop(id, backdrop);

    // Forced on natively and compensated here instead: the native subtraction
    // is derived from where the host sits in the window, so an ancestor
    // transform (the background scale) would re-anchor the sheet mid-animation.
    const topOffset = extendUnderStatusBar ? 0 : insets.top;

    const detents =
      detentsProp ?? (fullHeight ? [0, FULL_HEIGHT_DETENT] : DEFAULT_DETENTS);

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
    // Top two only; a detached sheet's bottom corners belong to its frame.
    const radiusStyle: ViewStyle = {
      borderTopLeftRadius: surfaceRadius,
      borderTopRightRadius: surfaceRadius,
    };

    const resolvedBottomInset =
      bottomInset ?? Math.max(insets.bottom, DEFAULT_DETACHED_INSET);
    const resolvedHorizontalInset = horizontalInset ?? DEFAULT_DETACHED_INSET;

    const baseSurface = surface ?? (
      <View
        style={[StyleSheet.absoluteFill, stylesheet.surface, radiusStyle]}
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
      if (isClosedDetent(detents, settledIndex)) {
        handleClosed();
      } else {
        handleOpened();
      }
      onSettle?.(settledIndex);
    };

    const handleNativeIndexChange = (nextIndex: number) => {
      const prevIndex = lastIndexRef.current;
      lastIndexRef.current = nextIndex;
      if (isClosedDetent(detents, nextIndex)) {
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
    // A detached sheet clips to its own card instead, so the inner wrapper
    // leaves the corners alone.
    const clipStyle: ViewStyle | null =
      surfaceRadius > 0 && !detached
        ? { overflow: 'hidden', ...radiusStyle }
        : null;
    // Applies to every sheet size: a content-sized sheet re-measures taller, a
    // fixed-height one (carries `fillStyle`) shrinks its scroll area instead.
    const needsKeyboardInset = keyboardBehavior === 'inset';

    const innerStyle = [fillStyle, handleInsetStyle, clipStyle];
    const needsInnerWrapper = fillStyle || handleInsetStyle || clipStyle;

    const inner = needsKeyboardInset ? (
      <SwmansionKeyboardInset style={innerStyle}>
        {children}
      </SwmansionKeyboardInset>
    ) : needsInnerWrapper ? (
      <View style={innerStyle}>{children}</View>
    ) : (
      children
    );

    // The detached card is a margin box inside the sheet's own content region,
    // not a frame around an inset host. Because it hangs off the sheet's top
    // edge, its bottom travels with the sheet — so it enters from below the
    // screen and leaves the same way, with nothing to clip and no gap to
    // reopen mid-animation.
    const cardStyle: ViewStyle = {
      marginLeft: resolvedHorizontalInset,
      marginRight: resolvedHorizontalInset,
      marginBottom: resolvedBottomInset,
      borderRadius: surfaceRadius,
      overflow: 'hidden',
    };

    const content = detached ? (
      <View style={[fillStyle, cardStyle]}>
        {baseSurface}
        {handleResult?.overlay}
        {inner}
      </View>
    ) : (
      inner
    );

    return (
      <BottomSheet
        {...props}
        extendUnderStatusBar
        detents={resolvedDetents}
        style={[{ top: topOffset }, style]}
        // Managed by the adapter (not overridable):
        index={index}
        animateIn
        wrapNativeView={Animated.createAnimatedComponent}
        onIndexChange={handleNativeIndexChange}
        onSettle={handleNativeSettle}
        onPositionChange={onPositionChange}
        surface={detached ? undefined : composedSurface}
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
