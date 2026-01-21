import { createContext, useContext, type RefObject } from 'react';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

type SheetRef = RefObject<BottomSheetMethods | null>;

/**
 * Context for passing sheet ref from BottomSheetPersistent/BottomSheetPortal
 * to BottomSheetManaged. This allows automatic ref binding without user intervention.
 */
export const BottomSheetRefContext = createContext<SheetRef | null>(null);

export function useBottomSheetRefContext(): SheetRef | null {
  return useContext(BottomSheetRefContext);
}
