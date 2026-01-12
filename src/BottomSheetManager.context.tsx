import React from 'react';

interface BottomSheetManagerContextValue {
  groupId: string;
}

export const BottomSheetManagerContext =
  React.createContext<BottomSheetManagerContextValue | null>(null);
