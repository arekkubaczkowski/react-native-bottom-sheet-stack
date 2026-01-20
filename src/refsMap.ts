import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import type { RefObject } from 'react';

type SheetRef = RefObject<BottomSheetMethods | null>;

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
