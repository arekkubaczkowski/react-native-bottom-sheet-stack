import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn as create } from 'zustand/traditional';

import {
  applyModeToTopSheet,
  backdropValuesEqual,
  detachFromGroup,
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
  BottomSheetStoreState,
  OpenPayload,
  OpenRejectionReason,
  OpenResult,
} from './types';

/**
 * Translates the public `kind` discriminant into the flags the store records.
 *
 * `kind` is what callers reason about; `usePortal` is what the renderer checks.
 * Keeping the mapping in one place means no caller has to know the encoding.
 */
function toStoreFields(sheet: OpenPayload) {
  const { kind, ...rest } = sheet;
  return kind === 'inline'
    ? { ...rest, usePortal: false }
    : { ...rest, usePortal: true, content: undefined };
}

function warnRejectedOpen(id: string, reason: OpenRejectionReason) {
  if (!__DEV__) return;

  const explanations: Record<OpenRejectionReason, string> = {
    'already-active': `Sheet "${id}" is already on the stack. Re-opening an active sheet is a no-op by design; close it first, or use updateParams() to change its content.`,
    'group-busy': `Sheet "${id}" was not opened because another sheet in the same group is still animating open. Wait for it to settle (useBottomSheetStatus) before opening the next one.`,
    'group-mismatch': `Sheet "${id}" is registered to a different manager group than the one opening it. A sheet belongs to the group that mounted it; declare a separate sheet in the other group instead.`,
  };

  console.warn(`[BottomSheet] open() ignored. ${explanations[reason]}`);
}

/**
 * Guard-then-patch used by every "change one field on an existing sheet"
 * action: a write for an id the store no longer knows must leave the state
 * object untouched, so subscribers are not woken by a no-op.
 */
function patchSheet(
  state: BottomSheetStoreState,
  id: string,
  update: Partial<BottomSheetState>
): Partial<BottomSheetStoreState> {
  if (!state.sheetsById[id]) return state;
  return { sheetsById: updateSheet(state.sheetsById, id, update) };
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

      if (existingSheet && existingSheet.groupId !== sheet.groupId) {
        warnRejectedOpen(sheet.id, 'group-mismatch');
        return { opened: false, id: sheet.id, reason: 'group-mismatch' };
      }

      const hasOpeningInGroup = Object.values(state.sheetsById).some(
        (s) => s.groupId === sheet.groupId && s.status === 'opening'
      );
      if (hasOpeningInGroup) {
        warnRejectedOpen(sheet.id, 'group-busy');
        return { opened: false, id: sheet.id, reason: 'group-busy' };
      }

      const fields = toStoreFields(sheet);

      // Past the guards an existing record is always a persistent sheet, and
      // its session was allocated once at mount() — only a fresh portal sheet
      // needs one.
      const portalSession =
        fields.usePortal && !existingSheet
          ? getNextPortalSession(sheet.id)
          : undefined;

      resetAnimatedIndex(sheet.id);

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

        const newSheet: BottomSheetState = existingSheet
          ? {
              ...existingSheet,
              status: 'opening',
              scaleBackground:
                sheet.scaleBackground ?? existingSheet.scaleBackground,
              params: sheet.params ?? existingSheet.params,
            }
          : { ...fields, status: 'opening', portalSession };

        return {
          sheetsById: { ...updatedSheetsById, [sheet.id]: newSheet },
          stackOrderByGroup: withGroupStack(
            current.stackOrderByGroup,
            sheet.groupId,
            // Re-appended rather than pushed: a sheet parked as `hidden` by
            // `switch` is still on the stack, and pushing would duplicate it.
            [...removeFromStack(groupStack, sheet.id), sheet.id]
          ),
        };
      });

      return { opened: true, id: sheet.id };
    },

    markOpen: (id) => set((state) => patchSheet(state, id, { status: 'open' })),

    startClosing: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet || isHidden(sheet)) return state;

        let updatedSheetsById = updateSheet(state.sheetsById, id, {
          status: 'closing',
        });

        // Only the top of the group uncovers anything. Restoring from further
        // down would animate a switched-away sheet back in *underneath* the
        // current top, and leave the group wedged on the `opening` guard.
        const groupStack = getGroupStack(
          state.stackOrderByGroup,
          sheet.groupId
        );
        if (getTopSheetId(groupStack) === id) {
          const belowId = getSheetBelowId(groupStack, id);
          if (belowId && isHidden(updatedSheetsById[belowId])) {
            updatedSheetsById = updateSheet(updatedSheetsById, belowId, {
              status: 'opening',
            });
          }
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

        return detachFromGroup(
          updatedSheetsById,
          state.stackOrderByGroup,
          sheet.groupId,
          id
        );
      }),

    updateParams: (id, params) =>
      set((state) => patchSheet(state, id, { params })),

    setPreventDismiss: (id, prevent) =>
      set((state) => patchSheet(state, id, { preventDismiss: prevent })),

    // `true` clears the override (back to the group default) rather than
    // storing a truthy flag — the old boolean restore keeps its meaning now
    // that the field can also hold a config. The equality bail matters:
    // adapters re-apply their `backdrop` prop with a fresh object literal on
    // every consumer render, and without it each render would wake every
    // subscriber of the store.
    setBackdrop: (id, backdrop) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet) return state;

        const next = backdrop === true ? undefined : backdrop;
        if (backdropValuesEqual(sheet.backdrop, next)) return state;

        return {
          sheetsById: updateSheet(state.sheetsById, id, { backdrop: next }),
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

        // A persistent sheet is portal-based by definition — it stays mounted
        // where it was declared and teleports in. The session is allocated once
        // and reused across every open/close cycle.
        return {
          sheetsById: {
            ...state.sheetsById,
            [sheet.id]: {
              ...sheet,
              status: 'hidden',
              usePortal: true,
              keepMounted: true,
              portalSession: getNextPortalSession(sheet.id),
            },
          },
        };
      }),

    unmount: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet) return state;

        const updatedSheetsById = { ...state.sheetsById };
        delete updatedSheetsById[id];

        return detachFromGroup(
          updatedSheetsById,
          state.stackOrderByGroup,
          sheet.groupId,
          id
        );
      }),
  }))
);
