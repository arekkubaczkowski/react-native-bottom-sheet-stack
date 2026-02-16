import { createContext, useContext } from 'react';
import type { SheetRef } from './adapter.types';

/**
 * Context for passing sheet ref from BottomSheetPersistent/BottomSheetPortal
 * to BottomSheetManaged. This allows automatic ref binding without user intervention.
 */
export const BottomSheetRefContext = createContext<SheetRef | null>(null);

export function useBottomSheetRefContext(): SheetRef | null {
  return useContext(BottomSheetRefContext);
}
