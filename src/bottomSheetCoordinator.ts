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
            if (ref) ref.close();
            break;
          case 'closing':
            if (ref) ref.close();
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
    const { startClosing } = useBottomSheetStore.getState();
    const currentStatus =
      useBottomSheetStore.getState().sheetsById[sheetId]?.status;

    if (currentStatus === 'open' || currentStatus === 'opening') {
      startClosing(sheetId);
    }
  };

  const handleOpened = () => {
    const { markOpen } = useBottomSheetStore.getState();
    const currentStatus =
      useBottomSheetStore.getState().sheetsById[sheetId]?.status;

    if (currentStatus === 'opening') {
      markOpen(sheetId);
    }
  };

  const handleClosed = () => {
    const { finishClosing } = useBottomSheetStore.getState();
    const currentStatus =
      useBottomSheetStore.getState().sheetsById[sheetId]?.status;

    if (currentStatus !== 'hidden') {
      finishClosing(sheetId);
    }
  };

  return {
    handleDismiss,
    handleOpened,
    handleClosed,
  };
}
