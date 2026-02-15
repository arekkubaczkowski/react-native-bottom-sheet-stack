import type { SheetAdapterEvents } from './adapter.types';
import { useBottomSheetStore } from './bottomSheet.store';
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
            ref?.expand();
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
 * Creates event handlers that adapters call to sync UI state back to the store.
 * Direction: Adapter Events → Store
 *
 * Adapters must call:
 * - `handleDismiss()` when the user initiates dismissal (swipe, backdrop tap, back button)
 * - `handleOpened()` when the show animation completes
 * - `handleClosed()` when the hide animation completes
 */
export function createSheetEventHandlers(
  sheetId: string
): SheetAdapterEvents {
  const handleDismiss = () => {
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
