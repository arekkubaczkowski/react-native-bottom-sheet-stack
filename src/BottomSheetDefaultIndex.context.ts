import { createContext, useContext } from 'react';

interface BottomSheetDefaultIndexContextValue {
  defaultIndex: number;
}

export const BottomSheetDefaultIndexContext =
  createContext<BottomSheetDefaultIndexContextValue | null>(null);

export function useBottomSheetDefaultIndex(): number {
  const context = useContext(BottomSheetDefaultIndexContext);
  // Default to 0 (open) if no provider - for regular sheets
  return context?.defaultIndex ?? 0;
}
