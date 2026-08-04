import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { useIsTopmostAndOpen } from './store';

/**
 * Manages Android hardware back button for a sheet.
 *
 * The listener is only active when the sheet is fully open AND is the topmost
 * sheet **of its own group** — a sheet in another group never suppresses it.
 */
export function useBackHandler(id: string, onBackPress: () => void): void {
  const isTopAndOpen = useIsTopmostAndOpen(id);

  useEffect(() => {
    if (!isTopAndOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBackPress();
        return true;
      }
    );
    return () => subscription.remove();
  }, [isTopAndOpen, onBackPress]);
}
