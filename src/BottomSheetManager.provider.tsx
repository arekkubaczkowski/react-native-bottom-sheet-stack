import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheetManagerContext } from './BottomSheetManager.context';

export interface ScaleBackgroundConfig {
  /** Scale factor when sheet is open (default: 0.92) */
  scale?: number;
  /** Vertical translation when sheet is open (default: 10) */
  translateY?: number;
  /** Border radius when sheet is open (default: 12) */
  borderRadius?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
}

interface ProviderProps extends PropsWithChildren {
  id: string;
}

/**
 * Provider for bottom sheet manager context.
 * Use ScaleBackgroundWrapper inside to enable iOS-style scale effect on content.
 */
function BottomSheetManagerProviderComp({ id, children }: ProviderProps) {
  return (
    <BottomSheetManagerContext.Provider key={id} value={{ groupId: id }}>
      <View style={styles.container}>{children}</View>
    </BottomSheetManagerContext.Provider>
  );
}

export const BottomSheetManagerProvider = React.memo(
  BottomSheetManagerProviderComp
);

export const useBottomSheetManagerContext = () => {
  const context = React.useContext(BottomSheetManagerContext);

  if (!context) {
    throw new Error(
      'useBottomSheetManagerContext must be used within a BottomSheetManagerProvider'
    );
  }
  return context;
};

export const useMaybeBottomSheetManagerContext = () => {
  const context = React.useContext(BottomSheetManagerContext);

  if (!context) {
    return null;
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
