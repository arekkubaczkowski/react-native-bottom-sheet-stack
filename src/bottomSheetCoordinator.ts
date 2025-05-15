import { useBottomSheetStore } from './bottomSheet.store';
import { sheetRefs } from './refsMap';

export function initBottomSheetCoordinator() {
  useBottomSheetStore.subscribe(
    (s) => s.stack.map(({ id, status }) => ({ id, status })),
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
