import {
  useBottomSheetStore,
  type BottomSheetStatus,
} from './bottomSheet.store';
import type { BottomSheetPortalId } from './portal.types';

export interface UseBottomSheetStatusReturn {
  status: BottomSheetStatus | null;
  isOpen: boolean;
}

export function useBottomSheetStatus(
  id: BottomSheetPortalId
): UseBottomSheetStatusReturn {
  const status = useBottomSheetStore(
    (state) => state.sheetsById[id]?.status ?? null
  );

  const isOpen = status === 'open' || status === 'opening';

  return {
    status,
    isOpen,
  };
}
