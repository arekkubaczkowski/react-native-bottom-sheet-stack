import {
  useSheetStatus,
  useIsSheetOpen,
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
  const status = useSheetStatus(id) ?? null;
  const isOpen = useIsSheetOpen(id);

  return {
    status,
    isOpen,
  };
}
