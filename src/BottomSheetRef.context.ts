import { createContext, useContext } from 'react';
import type { SheetRef } from './adapter.types';

/**
 * Carries the sheet ref from `BottomSheetPersistent` / `BottomSheetPortal` down
 * to the adapter, so ref binding needs no user intervention.
 */
export const BottomSheetRefContext = createContext<SheetRef | null>(null);

/** The enclosing sheet's ref, or `null` outside a portal/persistent sheet. */
export function useMaybeBottomSheetRef(): SheetRef | null {
  return useContext(BottomSheetRefContext);
}
