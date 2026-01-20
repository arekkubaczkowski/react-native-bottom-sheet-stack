import React from 'react';
import type { ScaleConfig } from './useScaleAnimation';

export interface BottomSheetManagerContextValue {
  groupId: string;
  scaleConfig?: ScaleConfig;
}

export const BottomSheetManagerContext =
  React.createContext<BottomSheetManagerContextValue | null>(null);
