import { type PropsWithChildren } from 'react';
import { PortalProvider } from 'react-native-teleport';

import { BottomSheetManagerContext } from './BottomSheetManager.context';
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
