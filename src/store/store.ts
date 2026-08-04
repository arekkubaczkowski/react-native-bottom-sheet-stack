import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn as create } from 'zustand/traditional';

import {
  applyModeToTopSheet,
  getGroupStack,
  getSheetBelowId,
  getTopSheetId,
  isActivatableKeepMounted,
  isHidden,
  removeFromStack,
  updateSheet,
  withGroupStack,
} from './helpers';
import { ensureAnimatedIndex, resetAnimatedIndex } from '../animatedRegistry';
import { getNextPortalSession } from '../portalSessionRegistry';
import type {
  BottomSheetState,
  BottomSheetStore,
  OpenRejectionReason,
  OpenResult,
} from './types';

function warnRejectedOpen(id: string, reason: OpenRejectionReason) {
  if (!__DEV__) return;

  const explanation =
    reason === 'already-active'
      ? `Sheet "${id}" is already on the stack. Re-opening an active sheet is a no-op by design; close it first, or use updateParams() to change its content.`
      : `Sheet "${id}" was not opened because another sheet in the same group is still animating open. Wait for it to settle (useBottomSheetStatus) before opening the next one.`;

  console.warn(`[BottomSheet] open() ignored. ${explanation}`);
}

export const useBottomSheetStore = create(
  subscribeWithSelector<BottomSheetStore>((set, get) => ({
    sheetsById: {},
    stackOrderByGroup: {},

    open: (sheet, mode = 'push'): OpenResult => {
      const state = get();
      const existingSheet = state.sheetsById[sheet.id];

      // Guards run before the write so the caller can be told what happened —
      // a silently dropped open is indistinguishable from a broken one.
      if (existingSheet && !isActivatableKeepMounted(existingSheet)) {
        warnRejectedOpen(sheet.id, 'already-active');
        return { opened: false, id: sheet.id, reason: 'already-active' };
      }

      const hasOpeningInGroup = Object.values(state.sheetsById).some(
        (s) => s.groupId === sheet.groupId && s.status === 'opening'
      );
      if (hasOpeningInGroup) {
        warnRejectedOpen(sheet.id, 'group-busy');
        return { opened: false, id: sheet.id, reason: 'group-busy' };
      }

      set((current) => {
        const groupStack = getGroupStack(
          current.stackOrderByGroup,
          sheet.groupId
        );

        const updatedSheetsById = applyModeToTopSheet(
          current.sheetsById,
          groupStack,
          mode
        );

        const shouldGetNewPortalSession =
          sheet.usePortal && (!existingSheet || !existingSheet.keepMounted);
        const nextPortalSession = shouldGetNewPortalSession
          ? getNextPortalSession(sheet.id)
          : undefined;

        resetAnimatedIndex(sheet.id);

        const newSheet: BottomSheetState = existingSheet
          ? {
              ...existingSheet,
              status: 'opening',
              scaleBackground:
                sheet.scaleBackground ?? existingSheet.scaleBackground,
              backdrop: sheet.backdrop ?? existingSheet.backdrop,
              params: sheet.params ?? existingSheet.params,
              portalSession: existingSheet.keepMounted
                ? existingSheet.portalSession
                : (nextPortalSession ?? existingSheet.portalSession),
            }
          : { ...sheet, status: 'opening', portalSession: nextPortalSession };

        return {
          sheetsById: { ...updatedSheetsById, [sheet.id]: newSheet },
          stackOrderByGroup: withGroupStack(
            current.stackOrderByGroup,
            sheet.groupId,
            [...groupStack, sheet.id]
          ),
        };
      });

      return { opened: true, id: sheet.id };
    },

    markOpen: (id) =>
      set((state) => {
        if (!state.sheetsById[id]) return state;
        return {
          sheetsById: updateSheet(state.sheetsById, id, { status: 'open' }),
        };
      }),

    startClosing: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet || isHidden(sheet)) return state;

        let updatedSheetsById = updateSheet(state.sheetsById, id, {
          status: 'closing',
        });

        const groupStack = getGroupStack(
          state.stackOrderByGroup,
          sheet.groupId
        );
        const belowId = getSheetBelowId(groupStack, id);
        if (belowId && isHidden(updatedSheetsById[belowId])) {
          updatedSheetsById = updateSheet(updatedSheetsById, belowId, {
            status: 'opening',
          });
        }

        return { sheetsById: updatedSheetsById };
      }),

    finishClosing: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet) return state;

        let updatedSheetsById = { ...state.sheetsById };

        if (sheet.keepMounted) {
          updatedSheetsById = updateSheet(updatedSheetsById, id, {
            status: 'hidden',
          });
        } else {
          delete updatedSheetsById[id];
        }

        const groupStack = getGroupStack(
          state.stackOrderByGroup,
          sheet.groupId
        );
        const newGroupStack = removeFromStack(groupStack, id);
        const topId = getTopSheetId(newGroupStack);

        if (topId && isHidden(updatedSheetsById[topId])) {
          updatedSheetsById = updateSheet(updatedSheetsById, topId, {
            status: 'opening',
          });
        }

        return {
          sheetsById: updatedSheetsById,
          stackOrderByGroup: withGroupStack(
            state.stackOrderByGroup,
            sheet.groupId,
            newGroupStack
          ),
        };
      }),

    updateParams: (id, params) =>
      set((state) => {
        if (!state.sheetsById[id]) return state;
        return { sheetsById: updateSheet(state.sheetsById, id, { params }) };
      }),

    setPreventDismiss: (id, prevent) =>
      set((state) => {
        if (!state.sheetsById[id]) return state;
        return {
          sheetsById: updateSheet(state.sheetsById, id, {
            preventDismiss: prevent,
          }),
        };
      }),

    setBackdrop: (id, backdrop) =>
      set((state) => {
        if (!state.sheetsById[id]) return state;
        return {
          sheetsById: updateSheet(state.sheetsById, id, { backdrop }),
        };
      }),

    clearGroup: (groupId) =>
      set((state) => {
        const idsToRemove = new Set(
          Object.keys(state.sheetsById).filter(
            (id) => state.sheetsById[id]?.groupId === groupId
          )
        );

        if (idsToRemove.size === 0) return state;

        const updatedSheetsById = { ...state.sheetsById };
        idsToRemove.forEach((id) => delete updatedSheetsById[id]);

        return {
          sheetsById: updatedSheetsById,
          stackOrderByGroup: withGroupStack(
            state.stackOrderByGroup,
            groupId,
            []
          ),
        };
      }),

    clearAll: () => set({ sheetsById: {}, stackOrderByGroup: {} }),

    mount: (sheet) =>
      set((state) => {
        if (state.sheetsById[sheet.id]) return state;

        ensureAnimatedIndex(sheet.id);

        // For portal-based persistent sheets, set initial portalSession
        // This session will be reused across open/close cycles
        const portalSession = sheet.usePortal
          ? getNextPortalSession(sheet.id)
          : undefined;

        return {
          sheetsById: {
            ...state.sheetsById,
            [sheet.id]: { ...sheet, status: 'hidden', portalSession },
          },
        };
      }),

    unmount: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet) return state;

        const updatedSheetsById = { ...state.sheetsById };
        delete updatedSheetsById[id];

        const groupStack = getGroupStack(
          state.stackOrderByGroup,
          sheet.groupId
        );

        return {
          sheetsById: updatedSheetsById,
          stackOrderByGroup: withGroupStack(
            state.stackOrderByGroup,
            sheet.groupId,
            removeFromStack(groupStack, id)
          ),
        };
      }),
  }))
);
