import React from 'react';

export interface BottomSheetManagerContextValue {
  groupId: string;
}

export const BottomSheetManagerContext =
  React.createContext<BottomSheetManagerContextValue | null>(null);
