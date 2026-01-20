import React, { useMemo, type PropsWithChildren } from 'react';

import {
  BottomSheetManagerContext,
  type BottomSheetManagerContextValue,
} from './BottomSheetManager.context';
import type { ScaleConfig } from './useScaleAnimation';

interface ProviderProps extends PropsWithChildren {
  id: string;
  scaleConfig?: ScaleConfig;
}

function BottomSheetManagerProviderComp({
  id,
  scaleConfig,
  children,
}: ProviderProps) {
  const value = useMemo(
    () => ({ groupId: id, scaleConfig }),
    [id, scaleConfig]
  );

  return (
    <BottomSheetManagerContext.Provider key={id} value={value}>
      {children}
    </BottomSheetManagerContext.Provider>
  );
}

export const BottomSheetManagerProvider = React.memo(
  BottomSheetManagerProviderComp
);

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
