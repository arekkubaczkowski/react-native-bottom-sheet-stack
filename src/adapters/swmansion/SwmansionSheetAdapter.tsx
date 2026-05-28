import React, { useImperativeHandle, useRef, useState } from 'react';

import type { SheetAdapterRef } from '../../adapter.types';
import { useSheetPreventDismiss } from '../../bottomSheet.store';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useAdapterRef } from '../../useAdapterRef';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBottomSheetContext } from '../../useBottomSheetContext';

import type {
  BottomSheetProps,
  Detent,
  DetentValue,
} from '@swmansion/react-native-bottom-sheet';

// Loaded lazily so the main bundle never requires the native module unless
// this adapter is actually imported (it ships as an optional peer dependency).
const { BottomSheet } =
  require('@swmansion/react-native-bottom-sheet') as typeof import('@swmansion/react-native-bottom-sheet');

export type { Detent, DetentValue };
export { programmatic } from '@swmansion/react-native-bottom-sheet';

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
 * Every other prop (`detents`, `style`, `animateIn`, `scrimColor`,
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
      onIndexChange,
      onSettle,
      onPositionChange,
      ...props
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const ref = useAdapterRef(forwardedRef);
    const animatedIndex = useAnimatedIndex();
    const preventDismiss = useSheetPreventDismiss(id);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    // The adapter owns the snap index: it starts collapsed (0) and the
    // coordinator drives it open/closed via the imperative ref below.
    const [index, setIndex] = useState(0);

    const openIndex =
      expandedIndex != null ? expandedIndex : Math.max(0, detents.length - 1);

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
        handleClosed();
      } else {
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

    return (
      <BottomSheet
        {...props}
        detents={detents}
        animateIn={animateIn}
        // Managed by adapter (not overridable):
        index={index}
        modal={false}
        onIndexChange={handleNativeIndexChange}
        onSettle={handleNativeSettle}
        onPositionChange={handleNativePositionChange}
      >
        {children}
      </BottomSheet>
    );
  }
);

SwmansionSheetAdapter.displayName = 'SwmansionSheetAdapter';
