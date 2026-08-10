import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { BackdropConfig } from '../backdrop.types';
import type {
  BottomSheetState,
  BottomSheetStatus,
  BottomSheetStoreState,
  OpenMode,
} from './types';

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
 * Takes `id` off its group's stack and brings the sheet it was covering back.
 *
 * A sheet parked as `hidden` by `switch` is still on the stack, so whatever
 * removes the sheet above it — a finished close or an unmount — has to send it
 * to `opening`, or the group is left with a top sheet that renders as active
 * while actually being closed.
 */
export function detachFromGroup(
  sheetsById: Record<string, BottomSheetState>,
  stackOrderByGroup: Record<string, string[]>,
  groupId: string,
  id: string
): BottomSheetStoreState {
  const newGroupStack = removeFromStack(
    getGroupStack(stackOrderByGroup, groupId),
    id
  );
  const topId = getTopSheetId(newGroupStack);

  return {
    sheetsById:
      topId && isHidden(sheetsById[topId])
        ? updateSheet(sheetsById, topId, { status: 'opening' })
        : sheetsById,
    stackOrderByGroup: withGroupStack(
      stackOrderByGroup,
      groupId,
      newGroupStack
    ),
  };
}

/**
 * Value equality for a sheet's backdrop override.
 *
 * Adapters re-apply their `backdrop` prop from an effect, and JSX object
 * literals are fresh on every consumer render — comparing by value lets
 * `setBackdrop` skip the write, so a consumer re-render does not wake every
 * store subscriber. Styles are compared flattened; a value that defeats the
 * comparison only costs one redundant write, never a wrong render.
 */
export function backdropValuesEqual(
  a: BackdropConfig | false | undefined,
  b: BackdropConfig | false | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind || a.pressToDismiss !== b.pressToDismiss) return false;
  if (a.kind === 'custom' || b.kind === 'custom') {
    return (
      a.kind === 'custom' && b.kind === 'custom' && a.component === b.component
    );
  }
  return flattenedStylesEqual(a.style, b.style);
}

function flattenedStylesEqual(
  a: StyleProp<ViewStyle> | undefined,
  b: StyleProp<ViewStyle> | undefined
): boolean {
  const flatA = StyleSheet.flatten(a);
  const flatB = StyleSheet.flatten(b);
  if (flatA === flatB) return true;
  if (!flatA || !flatB) return !flatA && !flatB;

  const keysA = Object.keys(flatA) as (keyof ViewStyle)[];
  if (keysA.length !== Object.keys(flatB).length) return false;

  return keysA.every((key) => {
    const valueA = flatA[key];
    const valueB = flatB[key];
    if (Object.is(valueA, valueB)) return true;
    // Nested values (e.g. `transform`) miss the shallow check; they are plain
    // serializable style data, so structural comparison is sound.
    if (typeof valueA === 'object' && valueA && typeof valueB === 'object') {
      return JSON.stringify(valueA) === JSON.stringify(valueB);
    }
    return false;
  });
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
