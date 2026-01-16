import { useBottomSheetStore } from './bottomSheet.store';
import { sheetRefs } from './refsMap';

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

        const ref = sheetRefs[id]?.current;
        if (!ref) {
          return;
        }

        switch (status) {
          case 'opening':
            ref.expand();
            break;
          case 'hidden':
            ref.close();
            break;
          case 'closing':
            ref.close();
            break;
        }
      });
    }
  );
}

/**
 * Creates event handlers for a bottom sheet that sync gorhom events back to the store.
 * Direction: Gorhom Events → Store
 */
export function createSheetEventHandlers(sheetId: string) {
  const { startClosing, finishClosing, markOpen } =
    useBottomSheetStore.getState();

  const handleAnimate = (fromIndex: number, toIndex: number) => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    // Sheet is closing (animating to -1)
    if (toIndex === -1) {
      if (currentStatus === 'open' || currentStatus === 'opening') {
        startClosing(sheetId);
      }
    }

    // Sheet finished opening (animating from -1 to visible)
    if (fromIndex === -1 && toIndex >= 0) {
      markOpen(sheetId);
    }
  };

  const handleClose = () => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (currentStatus !== 'hidden') {
      finishClosing(sheetId);
    }
  };

  return {
    handleAnimate,
    handleClose,
  };
}
