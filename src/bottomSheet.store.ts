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
}

type TriggerState = Omit<BottomSheetState, 'status'>;

interface BottomSheetStoreState {
  stack: BottomSheetState[];
}

interface BottomSheetStoreActions {
  push(sheet: TriggerState): void;
  switch(sheet: TriggerState): void;
  replace(sheet: TriggerState): void;
  startClosing(id: string): void;
  finishClosing(id: string): void;
  clearAll(): void;
}

export const useBottomSheetStore = create(
  subscribeWithSelector<BottomSheetStoreState & BottomSheetStoreActions>(
    (set) => ({
      stack: [],

      push: (sheet) =>
        set((state) => {
          if (state.stack.some((s) => s.id === sheet.id)) {
            return { stack: state.stack };
          }
          return {
            stack: [...state.stack, { ...sheet, status: 'opening' }],
          };
        }),
      switch: (sheet) =>
        set((state) => {
          if (state.stack.some((s) => s.id === sheet.id)) {
            return { stack: state.stack };
          }

          const stack = [...state.stack];

          if (stack.length) {
            const topIndex = stack.length - 1;
            if (stack[topIndex]) {
              stack[topIndex] = { ...stack[topIndex], status: 'hidden' };
            }
          }

          stack.push({ ...sheet, status: 'opening' });

          return { stack };
        }),

      replace: (sheet) =>
        set((state) => {
          if (state.stack.some((s) => s.id === sheet.id)) {
            return { stack: state.stack };
          }

          const stack = [...state.stack];
          const prevTop = stack.pop();

          if (prevTop) {
            stack.push({ ...prevTop, status: 'closing' });
          }
          stack.push({ ...sheet, status: 'opening' });

          return { stack };
        }),
      startClosing: (id) =>
        set((state) => {
          const stack = [...state.stack];
          const index = stack.findIndex((s) => s.id === id);
          if (index === -1) {
            return { stack };
          }

          const closing = stack[index];
          if (closing?.status === 'hidden') {
            return { stack };
          }

          if (closing) {
            stack[index] = { ...closing, status: 'closing' };
          }

          const below = stack[index - 1];
          if (below && below.status === 'hidden') {
            stack[index - 1] = { ...below, status: 'opening' };
          }

          return { stack };
        }),

      finishClosing: (id) =>
        set((state) => {
          const stack = state.stack.filter((s) => s.id !== id);

          const topIndex = stack.length - 1;
          if (topIndex >= 0 && stack[topIndex]?.status === 'hidden') {
            stack[topIndex] = { ...stack[topIndex], status: 'opening' };
          }

          return { stack };
        }),

      clearAll: () => set(() => ({ stack: [] })),
    })
  )
);
