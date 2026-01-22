import { type ReactNode } from 'react';

export type BottomSheetStatus = 'opening' | 'open' | 'closing' | 'hidden';
export type OpenMode = 'push' | 'switch' | 'replace';

export interface BottomSheetState {
  groupId: string;
  id: string;
  content?: ReactNode;
  status: BottomSheetStatus;
  scaleBackground?: boolean;
  usePortal?: boolean;
  params?: Record<string, unknown>;
  keepMounted?: boolean;
}

export type TriggerState = Omit<BottomSheetState, 'status'>;

export interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;
  stackOrder: string[];
}

export interface BottomSheetStoreActions {
  open(sheet: TriggerState, mode?: OpenMode): void;
  markOpen(id: string): void;
  startClosing(id: string): void;
  finishClosing(id: string): void;
  updateParams(id: string, params: Record<string, unknown> | undefined): void;
  clearGroup(groupId: string): void;
  clearAll(): void;
  mount(sheet: Omit<BottomSheetState, 'status'>): void;
  unmount(id: string): void;
}

export type BottomSheetStore = BottomSheetStoreState & BottomSheetStoreActions;
