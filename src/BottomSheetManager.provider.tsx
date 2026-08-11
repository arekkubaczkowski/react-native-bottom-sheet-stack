import { type PropsWithChildren } from 'react';
import { PortalProvider } from 'react-native-teleport';

import { BottomSheetManagerContext } from './BottomSheetManager.context';
import type { BackdropConfig } from './backdrop.types';
import type { ScaleConfig } from './useScaleAnimation';

interface ProviderProps extends PropsWithChildren {
  id: string;
  scaleConfig?: ScaleConfig;
  /**
   * The group's default backdrop; `false` gives the whole group no backdrop.
   *
   * Same name and type as the adapters' `backdrop` prop, which overrides it per
   * sheet — the sheet's visual choice wins atomically; when both are `styled`
   * the styles compose, and `pressToDismiss` resolves per field.
   */
  backdrop?: BackdropConfig | false;
}

export function BottomSheetManagerProvider({
  id,
  scaleConfig,
  backdrop,
  children,
}: ProviderProps) {
  const value = { groupId: id, scaleConfig, backdrop };

  return (
    <PortalProvider>
      <BottomSheetManagerContext.Provider key={id} value={value}>
        {children}
      </BottomSheetManagerContext.Provider>
    </PortalProvider>
  );
}
