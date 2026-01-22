import type { BottomSheetState, BottomSheetStatus, OpenMode } from './types';

export const MODE_STATUS_MAP: Record<OpenMode, BottomSheetStatus | null> = {
  push: null,
  switch: 'hidden',
  replace: 'closing',
};

export function isActivatableKeepMounted(
  sheet: BottomSheetState | undefined
): sheet is BottomSheetState {
  return Boolean(sheet?.keepMounted && sheet.status === 'hidden');
}

export function isHidden(sheet: BottomSheetState | undefined): boolean {
  return sheet?.status === 'hidden';
}

export function isOpening(sheet: BottomSheetState | undefined): boolean {
  return sheet?.status === 'opening';
}

export function updateSheet(
  sheetsById: Record<string, BottomSheetState>,
  id: string,
  update: Partial<BottomSheetState>
): Record<string, BottomSheetState> {
  const sheet = sheetsById[id];
  if (!sheet) return sheetsById;

  return {
    ...sheetsById,
    [id]: { ...sheet, ...update },
  };
}

export function applyModeToTopSheet(
  sheetsById: Record<string, BottomSheetState>,
  stackOrder: string[],
  mode: OpenMode
): Record<string, BottomSheetState> {
  const targetStatus = MODE_STATUS_MAP[mode];
  if (!targetStatus) return sheetsById;

  const topId = stackOrder[stackOrder.length - 1];
  if (!topId || !sheetsById[topId]) return sheetsById;

  return updateSheet(sheetsById, topId, { status: targetStatus });
}

export function removeFromStack(stackOrder: string[], id: string): string[] {
  return stackOrder.filter((sheetId) => sheetId !== id);
}

export function getTopSheetId(stackOrder: string[]): string | undefined {
  return stackOrder[stackOrder.length - 1];
}

export function getSheetBelowId(
  stackOrder: string[],
  id: string
): string | undefined {
  const index = stackOrder.indexOf(id);
  return index > 0 ? stackOrder[index - 1] : undefined;
}
