import React, { useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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

// Loaded lazily so the main bundle never requires the native module unless
// this adapter is actually imported (it ships as an optional peer dependency).
const { BottomSheet, programmatic } =
  require('@swmansion/react-native-bottom-sheet') as typeof import('@swmansion/react-native-bottom-sheet');

export { programmatic } from '@swmansion/react-native-bottom-sheet';
export type { Detent, DetentValue };

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
 * Every other prop (`detents`, `style`, `animateIn`,
 * `disableScrollableNegotiation`) is forwarded. The lifecycle callbacks
 * (`onIndexChange`, `onSettle`, `onPositionChange`) are wrapped by the adapter
 * and your handlers are still invoked afterwards.
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
}

const DEFAULT_DETENTS: Detent[] = [0, 'content'];

function resolveDetentValue(detent: Detent): DetentValue {
  if (typeof detent === 'object' && detent !== null) {
    return detent.value;
  }
  return detent;
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
      detents = DEFAULT_DETENTS,
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
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);

    const surfaceWithDefaults = surface ?? (
      <View style={[StyleSheet.absoluteFill, stylesheet.surface]} />
    );

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    // Android hardware back dismisses the top, fully-open sheet — the same
    // contract the other adapters honor.
    useBackHandler(id, handleDismiss);

    const openIndex = expandedIndex ?? Math.max(0, detents.length - 1);

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
    const expandedDetentValue = resolveDetentValue(detents[openIndex] ?? 0);
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
        surface={surfaceWithDefaults}
      >
        {children}
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
});
