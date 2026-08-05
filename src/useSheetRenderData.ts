import { useBottomSheetStore, type BottomSheetState } from './store';
import { useBottomSheetManagerContext } from './BottomSheetManager.context';

export interface SheetRenderItem {
  id: string;
  stackIndex: number;
  isActive: boolean;
}

/**
 * Equality comparator for the selector below.
 *
 * The selector builds a fresh array on every store write, so reference equality
 * never holds and the host would re-render (remounting nothing, but re-running
 * every `QueueItem`) on state changes that do not affect what is rendered.
 */
function sheetRenderDataEqual(
  a: SheetRenderItem[],
  b: SheetRenderItem[]
): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const itemA = a[i]!;
    const itemB = b[i]!;
    if (
      itemA.id !== itemB.id ||
      itemA.stackIndex !== itemB.stackIndex ||
      itemA.isActive !== itemB.isActive
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Returns a flat list of sheets to render.
 *
 * Each sheet appears exactly once - this prevents React from
 * unmounting/remounting when a sheet transitions between states.
 *
 * Render order:
 * 1. Hidden persistent sheets (keepMounted=true, not in the group's stack)
 * 2. Active sheets (in the group's stack)
 */
export function useSheetRenderData(): SheetRenderItem[] {
  const { groupId } = useBottomSheetManagerContext();

  return useBottomSheetStore((state) => {
    const hiddenPersistent = getHiddenPersistentSheets(state, groupId);
    const active = getActiveSheets(state, groupId);

    return [...hiddenPersistent, ...active];
  }, sheetRenderDataEqual);
}

function getHiddenPersistentSheets(
  state: {
    sheetsById: Record<string, BottomSheetState>;
    stackOrderByGroup: Record<string, string[]>;
  },
  groupId: string
): SheetRenderItem[] {
  const inStack = new Set(state.stackOrderByGroup[groupId] ?? []);

  return Object.values(state.sheetsById)
    .filter((sheet) => isHiddenPersistent(sheet, groupId, inStack))
    .map((sheet) => ({
      id: sheet.id,
      stackIndex: -1,
      isActive: false,
    }));
}

function isHiddenPersistent(
  sheet: BottomSheetState,
  groupId: string,
  inStack: Set<string>
): boolean {
  const belongsToGroup = sheet.groupId === groupId;
  const isPersistent = sheet.keepMounted === true;
  const isHidden = sheet.status === 'hidden';
  const isNotInStack = !inStack.has(sheet.id);

  return belongsToGroup && isPersistent && isHidden && isNotInStack;
}

function getActiveSheets(
  state: {
    sheetsById: Record<string, BottomSheetState>;
    stackOrderByGroup: Record<string, string[]>;
  },
  groupId: string
): SheetRenderItem[] {
  // The stack is stored per group, so the index is already the sheet's depth
  // within its own group — which is what the z-index layering wants.
  return (state.stackOrderByGroup[groupId] ?? []).map((id, index) => ({
    id,
    stackIndex: index,
    isActive: true,
  }));
}
