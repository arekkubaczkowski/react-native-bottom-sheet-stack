import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { useIsTopmostAndOpen } from './store';
import { useStableCallback } from './useStableCallback';

/**
 * Manages Android hardware back button for a sheet.
 *
 * The listener is only active when the sheet is fully open AND is the topmost
 * sheet **of its own group** — a sheet in another group never suppresses it.
 */
export function useBackHandler(id: string, onBackPress: () => void): void {
  const isTopAndOpen = useIsTopmostAndOpen(id);
  // Adapters build their handler from `createSheetEventHandlers(id)` during
  // render, so it is a new function every time. Stabilising it keeps the native
  // listener subscribed for as long as the sheet is on top, instead of being
  // torn down and re-added on every render.
  const stableOnBackPress = useStableCallback(onBackPress);

  useEffect(() => {
    if (!isTopAndOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        stableOnBackPress();
        return true;
      }
    );
    return () => subscription.remove();
  }, [isTopAndOpen, stableOnBackPress]);
}
