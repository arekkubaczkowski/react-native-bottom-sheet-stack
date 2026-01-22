import { useBottomSheetStore } from './bottomSheet.store';
import { getSheetRef } from './refsMap';

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
              getSheetRef(id)?.current?.expand();
            });
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
 * Creates event handlers for a bottom sheet that sync gorhom events back to the store.
 * Direction: Gorhom Events → Store
 */
export function createSheetEventHandlers(sheetId: string) {
  const { startClosing, finishClosing, markOpen } =
    useBottomSheetStore.getState();

  const handleAnimate = (_fromIndex: number, toIndex: number) => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (toIndex === -1 && currentStatus === 'open') {
      startClosing(sheetId);
    }
  };

  const handleChange = (index: number) => {
    const state = useBottomSheetStore.getState();
    const currentStatus = state.sheetsById[sheetId]?.status;

    if (index >= 0 && currentStatus === 'opening') {
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
    handleChange,
    handleClose,
  };
}
