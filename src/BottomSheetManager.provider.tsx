import React, { type PropsWithChildren } from 'react';

import {
  BottomSheetManagerContext,
  type BottomSheetManagerContextValue,
} from './BottomSheetManager.context';

interface ProviderProps extends PropsWithChildren {
  id: string;
}

function BottomSheetManagerProviderComp({ id, children }: ProviderProps) {
  return (
    <BottomSheetManagerContext.Provider key={id} value={{ groupId: id }}>
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
