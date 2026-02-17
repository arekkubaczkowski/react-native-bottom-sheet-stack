import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn as create } from 'zustand/traditional';

import {
  applyModeToTopSheet,
  getSheetBelowId,
  getTopSheetId,
  isActivatableKeepMounted,
  isHidden,
  removeFromStack,
  updateSheet,
} from './helpers';
import { ensureAnimatedIndex } from '../animatedRegistry';
import { getNextPortalSession } from '../portalSessionRegistry';
import type { BottomSheetState, BottomSheetStore } from './types';

export const useBottomSheetStore = create(
  subscribeWithSelector<BottomSheetStore>((set) => ({
    sheetsById: {},
    stackOrder: [],

    open: (sheet, mode = 'push') =>
      set((state) => {
        const existingSheet = state.sheetsById[sheet.id];

        if (existingSheet && !isActivatableKeepMounted(existingSheet)) {
          return state;
        }

        const hasOpeningInGroup = Object.values(state.sheetsById).some(
          (s) => s.groupId === sheet.groupId && s.status === 'opening'
        );
        if (hasOpeningInGroup) {
          return state;
        }

        const updatedSheetsById = applyModeToTopSheet(
          state.sheetsById,
          state.stackOrder,
          mode
        );

        const shouldGetNewPortalSession =
          sheet.usePortal && (!existingSheet || !existingSheet.keepMounted);
        const nextPortalSession = shouldGetNewPortalSession
          ? getNextPortalSession(sheet.id)
          : undefined;

        ensureAnimatedIndex(sheet.id);

        const newSheet: BottomSheetState = existingSheet
          ? {
              ...existingSheet,
              status: 'opening',
              scaleBackground:
                sheet.scaleBackground ?? existingSheet.scaleBackground,
              params: sheet.params ?? existingSheet.params,
              portalSession: existingSheet.keepMounted
                ? existingSheet.portalSession
                : (nextPortalSession ?? existingSheet.portalSession),
            }
          : { ...sheet, status: 'opening', portalSession: nextPortalSession };

        return {
          sheetsById: { ...updatedSheetsById, [sheet.id]: newSheet },
          stackOrder: [...state.stackOrder, sheet.id],
        };
      }),

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

        const belowId = getSheetBelowId(state.stackOrder, id);
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

        const newStackOrder = removeFromStack(state.stackOrder, id);
        const topId = getTopSheetId(newStackOrder);

        if (topId && isHidden(updatedSheetsById[topId])) {
          updatedSheetsById = updateSheet(updatedSheetsById, topId, {
            status: 'opening',
          });
        }

        return {
          sheetsById: updatedSheetsById,
          stackOrder: newStackOrder,
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
          stackOrder: state.stackOrder.filter((id) => !idsToRemove.has(id)),
        };
      }),

    clearAll: () => set({ sheetsById: {}, stackOrder: [] }),

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
        if (!state.sheetsById[id]) return state;

        const updatedSheetsById = { ...state.sheetsById };
        delete updatedSheetsById[id];

        return {
          sheetsById: updatedSheetsById,
          stackOrder: removeFromStack(state.stackOrder, id),
        };
      }),
  }))
);
