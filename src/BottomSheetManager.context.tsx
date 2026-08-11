import React from 'react';
import type { BackdropConfig } from './backdrop.types';
import type { ScaleConfig } from './useScaleAnimation';

export interface BottomSheetManagerContextValue {
  groupId: string;
  scaleConfig?: ScaleConfig;
  backdrop?: BackdropConfig | false;
}

export const BottomSheetManagerContext =
  React.createContext<BottomSheetManagerContextValue | null>(null);

/**
 * The enclosing manager's context. Throws outside a provider.
 *
 * Naming convention across the context files: a `useMaybe*` hook can return
 * `null`/`undefined` and leaves handling that to the caller; a plain `use*`
 * hook either throws or resolves to a documented default.
 */
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

/** As {@link useBottomSheetManagerContext}, but `null` outside a provider. */
export const useMaybeBottomSheetManagerContext =
  (): BottomSheetManagerContextValue | null =>
    React.useContext(BottomSheetManagerContext);
