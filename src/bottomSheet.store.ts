import { type ReactNode } from 'react';
import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn as create } from 'zustand/traditional';

export type BottomSheetStatus = 'opening' | 'open' | 'closing' | 'hidden';
export type OpenMode = 'push' | 'switch' | 'replace';

export interface BottomSheetState {
  groupId: string;
  id: string;
  content: ReactNode;
  status: BottomSheetStatus;
  scaleBackground?: boolean;
  usePortal?: boolean;
  params?: Record<string, unknown>;
}

type TriggerState = Omit<BottomSheetState, 'status'>;

interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;
  stackOrder: string[];
}

interface BottomSheetStoreActions {
  open(sheet: TriggerState, mode?: OpenMode): void;
  markOpen(id: string): void;
  startClosing(id: string): void;
  finishClosing(id: string): void;
  updateParams(id: string, params: Record<string, unknown> | undefined): void;
  clearGroup(groupId: string): void;
  clearAll(): void;
}

export type BottomSheetStore = BottomSheetStoreState & BottomSheetStoreActions;

export const useBottomSheetStore = create(
  subscribeWithSelector<BottomSheetStore>((set) => ({
    sheetsById: {},
    stackOrder: [],

    open: (sheet, mode = 'push') =>
      set((state) => {
        if (state.sheetsById[sheet.id]) {
          return state;
        }

        const newSheetsById = { ...state.sheetsById };
        const topId = state.stackOrder[state.stackOrder.length - 1];

        if (mode === 'switch' && topId && newSheetsById[topId]) {
          newSheetsById[topId] = {
            ...newSheetsById[topId],
            status: 'hidden',
          };
        }

        if (mode === 'replace' && topId && newSheetsById[topId]) {
          newSheetsById[topId] = {
            ...newSheetsById[topId],
            status: 'closing',
          };
        }

        newSheetsById[sheet.id] = { ...sheet, status: 'opening' };

        return {
          sheetsById: newSheetsById,
          stackOrder: [...state.stackOrder, sheet.id],
        };
      }),

    markOpen: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet) {
          return state;
        }
        return {
          sheetsById: {
            ...state.sheetsById,
            [id]: { ...sheet, status: 'open' },
          },
        };
      }),

    startClosing: (id) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet || sheet.status === 'hidden') {
          return state;
        }

        const newSheetsById = { ...state.sheetsById };
        newSheetsById[id] = { ...sheet, status: 'closing' };

        const index = state.stackOrder.indexOf(id);
        const belowId = state.stackOrder[index - 1];
        const belowSheet = belowId ? newSheetsById[belowId] : undefined;

        if (belowId && belowSheet && belowSheet.status === 'hidden') {
          newSheetsById[belowId] = { ...belowSheet, status: 'opening' };
        }

        return { sheetsById: newSheetsById };
      }),

    finishClosing: (id) =>
      set((state) => {
        if (!state.sheetsById[id]) {
          return state;
        }

        const newSheetsById = { ...state.sheetsById };
        delete newSheetsById[id];

        const newStackOrder = state.stackOrder.filter(
          (sheetId) => sheetId !== id
        );

        const topId = newStackOrder[newStackOrder.length - 1];
        const topSheet = topId ? newSheetsById[topId] : undefined;

        if (topId && topSheet && topSheet.status === 'hidden') {
          newSheetsById[topId] = { ...topSheet, status: 'opening' };
        }

        return {
          sheetsById: newSheetsById,
          stackOrder: newStackOrder,
        };
      }),

    updateParams: (id, params) =>
      set((state) => {
        const sheet = state.sheetsById[id];
        if (!sheet) {
          return state;
        }
        return {
          sheetsById: {
            ...state.sheetsById,
            [id]: { ...sheet, params },
          },
        };
      }),

    clearGroup: (groupId) =>
      set((state) => {
        const idsToRemove = new Set(
          state.stackOrder.filter(
            (id) => state.sheetsById[id]?.groupId === groupId
          )
        );

        if (idsToRemove.size === 0) {
          return state;
        }

        const newSheetsById = { ...state.sheetsById };
        idsToRemove.forEach((id) => {
          delete newSheetsById[id];
        });

        return {
          sheetsById: newSheetsById,
          stackOrder: state.stackOrder.filter((id) => !idsToRemove.has(id)),
        };
      }),

    clearAll: () => set(() => ({ sheetsById: {}, stackOrder: [] })),
  }))
);
