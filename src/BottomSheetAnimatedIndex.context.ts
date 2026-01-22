import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export const BottomSheetAnimatedIndexContext = createContext<
  SharedValue<number> | undefined
>(undefined);

export function useBottomSheetAnimatedIndexContext(): SharedValue<number> {
  const context = useContext(BottomSheetAnimatedIndexContext);
  if (!context) {
    throw new Error(
      'useBottomSheetAnimatedIndexContext must be used within BottomSheetAnimatedIndexContext.Provider'
    );
  }
  return context;
}
