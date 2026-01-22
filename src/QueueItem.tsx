import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { PortalHost } from 'react-native-teleport';

import { cleanupAnimatedIndex } from './animatedRegistry';
import { BottomSheetContext } from './BottomSheet.context';
import {
  useSheetContent,
  useSheetUsePortal,
  useSheetKeepMounted,
  useSheetPortalSession,
  useStartClosing,
} from './bottomSheet.store';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { cleanupSheetRef } from './refsMap';
import { useScaleAnimatedStyle } from './useScaleAnimation';

interface QueueItemProps {
  id: string;
  stackIndex: number;
  isActive: boolean;
}

export function QueueItem({ id, stackIndex, isActive }: QueueItemProps) {
  const content = useSheetContent(id);
  const usePortal = useSheetUsePortal(id);
  const keepMounted = useSheetKeepMounted(id);
  const portalSession = useSheetPortalSession(id);
  const startClosing = useStartClosing();

  const { width, height } = useSafeAreaFrame();
  const scaleStyle = useScaleAnimatedStyle({ id });

  useEffect(() => {
    return () => {
      cleanupSheetRef(id);
      cleanupAnimatedIndex(id);
    };
  }, [id, keepMounted]);

  const backdropZIndex = stackIndex * 2;
  const contentZIndex = stackIndex * 2 + 1;

  return (
    <>
      {isActive && (
        <View
          style={[StyleSheet.absoluteFillObject, { zIndex: backdropZIndex }]}
          pointerEvents="box-none"
        >
          <BottomSheetBackdrop sheetId={id} onPress={() => startClosing(id)} />
        </View>
      )}

      <Animated.View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.container,
          { width, height, zIndex: contentZIndex },
          scaleStyle,
        ]}
      >
        {usePortal ? (
          <PortalHost
            name={`bottomsheet-${id}-${portalSession}`}
            style={{ width, height }}
          />
        ) : (
          <BottomSheetContext.Provider value={{ id }}>
            {content}
          </BottomSheetContext.Provider>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {},
});
