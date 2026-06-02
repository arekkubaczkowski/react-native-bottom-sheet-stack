import React, {
  isValidElement,
  type ReactElement,
  type ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  BottomSheetProps,
  Detent,
  DetentValue,
} from '@swmansion/react-native-bottom-sheet';

import type { SheetAdapterRef } from '../../adapter.types';
import { useSheetPreventDismiss } from '../../bottomSheet.store';
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
 * On top of the native surface the adapter layers a set of **opt-in
 * conveniences** ({@link handle}, {@link fullHeight}, {@link fillContent},
 * {@link keyboardBehavior}). Each defaults to off, so a bare
 * `<SwmansionSheetAdapter>` behaves exactly like the raw native sheet.
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
   * Expands the sheet to the full available height (window height minus the top
   * safe-area inset). A convenience for sheets that host a `flex: 1` scrollable
   * whose content can't size the sheet on its own.
   *
   * Ignored when explicit `detents` are passed — those win. Defaults to off.
   */
  fullHeight?: boolean;
  /**
   * Whether the content wrapper should flex to fill the sheet (`flex: 1`).
   *
   * Defaults to `true` for fixed-height sheets (explicit numeric `detents` or
   * {@link fullHeight}) so scrollables bind and footers pin to the bottom, and
   * `false` for content-sized sheets (`'content'` detent) so they keep sizing
   * to their content. Pass an explicit boolean to override the heuristic.
   */
  fillContent?: boolean;
  /**
   * Keyboard avoidance strategy. The native sheet has none of its own.
   *
   * - `'none'` (default) — no avoidance; raw behavior.
   * - `'inset'` — for content-sized sheets, grows the content by the keyboard
   *   height so it lifts clear of the keyboard (native-iOS behavior). No-op for
   *   fixed-height sheets, which should rely on their own scrollable.
   *
   * `'inset'` requires the optional peer `react-native-keyboard-controller`; if
   * it isn't installed the sheet renders without avoidance (a one-time dev
   * warning is logged).
   */
  keyboardBehavior?: 'none' | 'inset';
}

const DEFAULT_DETENTS: Detent[] = [0, 'content'];
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
 *   fade, falling back to a binary value until the open height is known.
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
      // native scrim would double up (and stays opaque in non-modal mode), so
      // it is disabled by default. Consumers can still override.
      scrimColor = 'transparent',
      onIndexChange,
      onSettle,
      onPositionChange,
      surface,
      handle,
      fullHeight,
      fillContent,
      keyboardBehavior = 'none',
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

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

    const baseSurface = surface ?? (
      <View style={[StyleSheet.absoluteFill, stylesheet.surface]} />
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

    // Open height, captured for a continuous backdrop fade. Seeded from a
    // numeric expanded detent when possible; otherwise learned on first settle.
    const openPositionRef = useRef<number | null>(
      typeof expandedDetentValue === 'number' && expandedDetentValue > 0
        ? expandedDetentValue
        : null
    );

    // The native sheet animates in to its mounted index (0 = collapsed) and
    // emits a settle at that detent before the coordinator drives expand(). That
    // initial settle must NOT be reported as a close, otherwise the sheet is
    // finished/removed before it ever opens — racing expand() and making opens
    // (especially stacked pushes) intermittently no-op.
    const hasOpenedRef = useRef(false);

    useImperativeHandle(
      ref,
      () => ({
        expand: () => setIndex(openIndex),
        close: () => setIndex(0),
      }),
      [openIndex]
    );

    const handleNativeSettle = (settledIndex: number) => {
      if (settledIndex <= 0) {
        animatedIndex.set(-1);
        // Ignore the collapsed-detent settle that fires during the initial
        // animate-in (before the sheet has ever opened). A real close only
        // happens after an open, so reporting it here would dismiss the sheet
        // prematurely and race expand().
        if (hasOpenedRef.current) {
          handleClosed();
        }
      } else {
        hasOpenedRef.current = true;
        animatedIndex.set(0);
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
      if (position > 0 && position > (openPositionRef.current ?? 0)) {
        openPositionRef.current = position;
      }
      const target = openPositionRef.current;
      if (target && target > 0) {
        const ratio = Math.max(0, Math.min(position / target, 1));
        // animatedIndex range: -1 (closed) → 0 (open).
        animatedIndex.set(ratio - 1);
      } else {
        animatedIndex.set(position > 0 ? 0 : -1);
      }
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
    const needsKeyboardInset = keyboardBehavior === 'inset' && !shouldFill;

    let content = children;
    if (needsKeyboardInset) {
      content = (
        <SwmansionKeyboardInset style={[fillStyle, handleInsetStyle]}>
          {children}
        </SwmansionKeyboardInset>
      );
    } else if (fillStyle || handleInsetStyle) {
      content = <View style={[fillStyle, handleInsetStyle]}>{children}</View>;
    }

    return (
      <BottomSheet
        {...props}
        detents={resolvedDetents}
        animateIn={animateIn}
        scrimColor={scrimColor}
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
