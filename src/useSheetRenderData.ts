import { shallow } from 'zustand/shallow';
import {
  useBottomSheetStore,
  type BottomSheetState,
} from './bottomSheet.store';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';

export interface SheetRenderItem {
  id: string;
  stackIndex: number;
  isActive: boolean;
}

/**
 * Returns a flat list of sheets to render.
 *
 * Each sheet appears exactly once - this prevents React from
 * unmounting/remounting when a sheet transitions between states.
 *
 * Render order:
 * 1. Hidden persistent sheets (keepMounted=true, not in stack)
 * 2. Active sheets (in stackOrder)
 */
export function useSheetRenderData(): SheetRenderItem[] {
  const { groupId } = useBottomSheetManagerContext();

  return useBottomSheetStore((state) => {
    const hiddenPersistent = getHiddenPersistentSheets(state, groupId);
    const active = getActiveSheets(state, groupId);

    return [...hiddenPersistent, ...active];
  }, shallow);
}

function getHiddenPersistentSheets(
  state: { sheetsById: Record<string, BottomSheetState>; stackOrder: string[] },
  groupId: string
): SheetRenderItem[] {
  const inStack = new Set(state.stackOrder);

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
  state: { sheetsById: Record<string, BottomSheetState>; stackOrder: string[] },
  groupId: string
): SheetRenderItem[] {
  return state.stackOrder
    .filter((id) => state.sheetsById[id]?.groupId === groupId)
    .map((id, index) => ({
      id,
      stackIndex: index,
      isActive: true,
    }));
}
