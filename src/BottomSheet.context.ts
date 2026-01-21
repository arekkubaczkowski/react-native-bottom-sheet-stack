import { createContext, useContext } from 'react';

interface BottomSheetContextValue {
  id: string;
}

export const BottomSheetContext = createContext<
  BottomSheetContextValue | undefined
>(undefined);

export function useMaybeBottomSheetContext() {
  return useContext(BottomSheetContext);
}
