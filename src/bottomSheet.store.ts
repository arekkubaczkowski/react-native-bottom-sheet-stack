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
}

type TriggerState = Omit<BottomSheetState, 'status'>;

interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;
  stackOrder: string[];
}

export interface PortalOpenOptions {
  scaleBackground?: boolean;
}

interface BottomSheetStoreActions {
  push(sheet: TriggerState): void;
  switch(sheet: TriggerState): void;
  replace(sheet: TriggerState): void;
  openPortal(id: string, groupId: string, options?: PortalOpenOptions): void;
  markOpen(id: string): void;
  startClosing(id: string): void;
  finishClosing(id: string): void;
  clearAll(): void;
}

export type BottomSheetStore = BottomSheetStoreState & BottomSheetStoreActions;

export const useBottomSheetStore = create(
  subscribeWithSelector<BottomSheetStore>((set) => ({
    sheetsById: {},
    stackOrder: [],

    push: (sheet) =>
      set((state) => {
        if (state.sheetsById[sheet.id]) {
          return state;
        }
        return {
          sheetsById: {
            ...state.sheetsById,
            [sheet.id]: { ...sheet, status: 'opening' },
          },
          stackOrder: [...state.stackOrder, sheet.id],
        };
      }),

    switch: (sheet) =>
      set((state) => {
        if (state.sheetsById[sheet.id]) {
          return state;
        }

        const newSheetsById = { ...state.sheetsById };
        const topId = state.stackOrder[state.stackOrder.length - 1];

        if (topId && newSheetsById[topId]) {
          newSheetsById[topId] = {
            ...newSheetsById[topId],
            status: 'hidden',
          };
        }

        newSheetsById[sheet.id] = { ...sheet, status: 'opening' };

        return {
          sheetsById: newSheetsById,
          stackOrder: [...state.stackOrder, sheet.id],
        };
      }),

    replace: (sheet) =>
      set((state) => {
        if (state.sheetsById[sheet.id]) {
          return state;
        }

        const newSheetsById = { ...state.sheetsById };
        const topId = state.stackOrder[state.stackOrder.length - 1];

        if (topId && newSheetsById[topId]) {
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

    openPortal: (id, groupId, options) =>
      set((state) => {
        if (state.sheetsById[id]) {
          return state;
        }
        return {
          sheetsById: {
            ...state.sheetsById,
            [id]: {
              id,
              groupId,
              content: null,
              status: 'opening',
              usePortal: true,
              scaleBackground: options?.scaleBackground,
            },
          },
          stackOrder: [...state.stackOrder, id],
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

    clearAll: () => set(() => ({ sheetsById: {}, stackOrder: [] })),
  }))
);
