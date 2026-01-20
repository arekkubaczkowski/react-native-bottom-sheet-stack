import React, { type PropsWithChildren } from 'react';
import { PortalProvider } from 'react-native-teleport';

import {
  BottomSheetManagerContext,
  type BottomSheetManagerContextValue,
} from './BottomSheetManager.context';
import type { ScaleConfig } from './useScaleAnimation';

interface ProviderProps extends PropsWithChildren {
  id: string;
  scaleConfig?: ScaleConfig;
}

export function BottomSheetManagerProvider({
  id,
  scaleConfig,
  children,
}: ProviderProps) {
  const value = { groupId: id, scaleConfig };

  return (
    <PortalProvider>
      <BottomSheetManagerContext.Provider key={id} value={value}>
        {children}
      </BottomSheetManagerContext.Provider>
    </PortalProvider>
  );
}

export const useBottomSheetManagerContext =
  (): BottomSheetManagerContextValue => {
    const context = React.useContext(BottomSheetManagerContext);

    if (!context) {
      throw new Error(
        'useBottomSheetManagerContext must be used within a BottomSheetManagerProvider'
      );
    }
    return context;
  };

export const useMaybeBottomSheetManagerContext =
  (): BottomSheetManagerContextValue | null => {
    const context = React.useContext(BottomSheetManagerContext);

    if (!context) {
      return null;
    }
    return context;
  };
