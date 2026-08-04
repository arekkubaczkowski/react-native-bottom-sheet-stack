import type { BottomSheetState, BottomSheetStatus, OpenMode } from './types';

/**
 * Status to force onto the previous top sheet when a new one opens.
 * `push` leaves it alone, hence the absent entry.
 */
const MODE_STATUS: Partial<Record<OpenMode, BottomSheetStatus>> = {
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

/**
 * Applies the open mode to the sheet currently on top of `groupStack`.
 *
 * Takes a single group's stack, never the whole store — that is what stops
 * `switch` / `replace` from reaching into a neighbouring group.
 */
export function applyModeToTopSheet(
  sheetsById: Record<string, BottomSheetState>,
  groupStack: string[],
  mode: OpenMode
): Record<string, BottomSheetState> {
  const targetStatus = MODE_STATUS[mode];
  if (!targetStatus) return sheetsById;

  const topId = getTopSheetId(groupStack);
  if (!topId || !sheetsById[topId]) return sheetsById;

  return updateSheet(sheetsById, topId, { status: targetStatus });
}

export function removeFromStack(groupStack: string[], id: string): string[] {
  return groupStack.filter((sheetId) => sheetId !== id);
}

export function getTopSheetId(groupStack: string[]): string | undefined {
  return groupStack[groupStack.length - 1];
}

export function getSheetBelowId(
  groupStack: string[],
  id: string
): string | undefined {
  const index = groupStack.indexOf(id);
  return index > 0 ? groupStack[index - 1] : undefined;
}

/** The stack for `groupId`, or an empty array when the group has no sheets. */
export function getGroupStack(
  stackOrderByGroup: Record<string, string[]>,
  groupId: string
): string[] {
  return stackOrderByGroup[groupId] ?? [];
}

/**
 * Returns `stackOrderByGroup` with `groupId`'s stack replaced, dropping the key
 * once its stack is empty so groups don't accumulate forever.
 */
export function withGroupStack(
  stackOrderByGroup: Record<string, string[]>,
  groupId: string,
  nextStack: string[]
): Record<string, string[]> {
  if (nextStack.length === 0) {
    if (!(groupId in stackOrderByGroup)) return stackOrderByGroup;
    const next = { ...stackOrderByGroup };
    delete next[groupId];
    return next;
  }
  return { ...stackOrderByGroup, [groupId]: nextStack };
}
