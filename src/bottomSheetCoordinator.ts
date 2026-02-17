import type { SheetAdapterEvents } from './adapter.types';
import { useBottomSheetStore } from './bottomSheet.store';
import { getOnBeforeClose } from './onBeforeCloseRegistry';
import { getSheetRef } from './refsMap';

/**
 * Subscribes to store changes and calls adapter ref methods.
 * Direction: Store → Adapter (via SheetAdapterRef)
 */
export function initBottomSheetCoordinator(groupId: string) {
  return useBottomSheetStore.subscribe(
    (s) =>
      s.stackOrder
        .filter((id) => s.sheetsById[id]?.groupId === groupId)
        .map((id) => ({ id, status: s.sheetsById[id]?.status })),
    (next, prev) => {
      next.forEach(({ id, status }) => {
        const prevStatus = prev.find((p) => p.id === id)?.status;

        if (prevStatus === status) {
          return;
        }

        const ref = getSheetRef(id)?.current;

        switch (status) {
          case 'opening':
            requestAnimationFrame(() => {
              const currentStatus =
                useBottomSheetStore.getState().sheetsById[id]?.status;
              if (currentStatus === 'opening') {
                getSheetRef(id)?.current?.expand();
              }
            });
            break;
          case 'hidden':
          case 'closing':
            ref?.close();
            break;
        }
      });
    }
  );
}

/**
 * Attempts to close a sheet, respecting the onBeforeClose interceptor.
 *
 * If an onBeforeClose callback is registered for the sheet and it returns
 * `false` (or resolves to `false`), the close is cancelled.
 *
 * @returns `true` if the close proceeded, `false` if it was intercepted.
 */
export async function requestClose(sheetId: string): Promise<boolean> {
  const interceptor = getOnBeforeClose(sheetId);

  if (interceptor) {
    try {
      const allowed = await interceptor();
      if (!allowed) {
        return false;
      }
    } catch (error) {
      // If the interceptor throws, cancel the close for safety
      if (__DEV__) {
        console.warn(
          `[BottomSheet] onBeforeClose interceptor threw an error for sheet "${sheetId}". ` +
            'Close cancelled for safety. Fix the interceptor to avoid this warning.',
          error
        );
      }
      return false;
    }
  }

  const state = useBottomSheetStore.getState();
  const currentStatus = state.sheetsById[sheetId]?.status;

  if (currentStatus === 'open' || currentStatus === 'opening') {
    state.startClosing(sheetId);
  }

  return true;
}

/**
 * Default stagger delay between cascading close animations (ms).
 */
const DEFAULT_STAGGER_MS = 100;

/**
 * Closes all sheets in a group from top to bottom with cascading animation.
 *
 * Each sheet is closed with a staggered delay so the user sees them
 * peel off one-by-one (similar to `popToRoot` in React Navigation).
 *
 * If a sheet has an `onBeforeClose` interceptor that rejects, the cascade
 * stops at that sheet — sheets below it remain open.
 *
 * @param groupId - The manager group to close sheets in.
 * @param options.stagger - Delay in ms between each close (default: 100).
 * @returns A promise that resolves when the cascade finishes (or is stopped).
 */
export async function closeAllAnimated(
  groupId: string,
  options?: { stagger?: number }
): Promise<void> {
  const stagger = options?.stagger ?? DEFAULT_STAGGER_MS;

  const state = useBottomSheetStore.getState();
  const groupSheetIds = state.stackOrder.filter(
    (id) => state.sheetsById[id]?.groupId === groupId
  );

  // Close from top to bottom (reverse order)
  const reversed = [...groupSheetIds].reverse();

  for (const sheetId of reversed) {
    const currentState = useBottomSheetStore.getState();
    const sheet = currentState.sheetsById[sheetId];

    // Skip sheets that are already closing or hidden
    if (!sheet || sheet.status === 'closing' || sheet.status === 'hidden') {
      continue;
    }

    const closed = await requestClose(sheetId);

    if (!closed) {
      // Interceptor blocked — stop the cascade
      break;
    }

    if (stagger > 0 && reversed.indexOf(sheetId) < reversed.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, stagger));
    }
  }
}

/**
 * Creates event handlers that adapters call to sync UI state back to the store.
 * Direction: Adapter Events → Store
 *
 * Adapters must call:
 * - `handleDismiss()` when the user initiates dismissal (swipe, backdrop tap, back button)
 * - `handleOpened()` when the show animation completes
 * - `handleClosed()` when the hide animation completes
 */
export function createSheetEventHandlers(sheetId: string): SheetAdapterEvents {
  const handleDismiss = () => {
    const interceptor = getOnBeforeClose(sheetId);

    if (interceptor) {
      requestClose(sheetId);
      return;
    }

    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus === 'open' || currentStatus === 'opening') {
      state.startClosing(sheetId);
    }
  };

  const handleOpened = () => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus === 'opening') {
      state.markOpen(sheetId);
    }
  };

  const handleClosed = () => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus !== 'hidden') {
      state.finishClosing(sheetId);
    }
  };

  return {
    handleDismiss,
    handleOpened,
    handleClosed,
  };
}
