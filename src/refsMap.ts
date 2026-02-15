import type { SheetRef } from './adapter.types';

const sheetRefsMap = new Map<string, SheetRef>();

export function getSheetRef(sheetId: string): SheetRef | undefined {
  return sheetRefsMap.get(sheetId);
}

export function setSheetRef(sheetId: string, ref: SheetRef): void {
  sheetRefsMap.set(sheetId, ref);
}

export function cleanupSheetRef(sheetId: string): void {
  sheetRefsMap.delete(sheetId);
}

/**
 * Reset all sheet refs. Useful for testing.
 * @internal
 */
export function __resetSheetRefs(): void {
  sheetRefsMap.clear();
}
