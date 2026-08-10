import { type PropsWithChildren } from 'react';
import { PortalProvider } from 'react-native-teleport';

import { BottomSheetManagerContext } from './BottomSheetManager.context';
import type { BackdropConfig } from './backdrop.types';
import type { ScaleConfig } from './useScaleAnimation';

interface ProviderProps extends PropsWithChildren {
  id: string;
  scaleConfig?: ScaleConfig;
  /**
   * The group's default backdrop. A sheet overrides it with the `backdrop`
   * prop on its adapter — the sheet's visual choice wins atomically; when both
   * are `styled` the styles compose, and `pressToDismiss` resolves per field.
   */
  backdropConfig?: BackdropConfig;
}

export function BottomSheetManagerProvider({
  id,
  scaleConfig,
  backdropConfig,
  children,
}: ProviderProps) {
  const value = { groupId: id, scaleConfig, backdropConfig };

  return (
    <PortalProvider>
      <BottomSheetManagerContext.Provider key={id} value={value}>
        {children}
      </BottomSheetManagerContext.Provider>
    </PortalProvider>
  );
}
