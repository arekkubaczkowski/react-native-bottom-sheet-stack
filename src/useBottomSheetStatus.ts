import { useSheetStatus, type BottomSheetStatus } from './bottomSheet.store';

export interface UseBottomSheetStatusReturn {
  status: BottomSheetStatus | null;
  isOpen: boolean;
}

export function useBottomSheetStatus(id: string): UseBottomSheetStatusReturn {
  const status = useSheetStatus(id) ?? null;

  return {
    status,
    isOpen: status === 'open' || status === 'opening',
  };
}
