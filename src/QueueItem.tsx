import { memo, useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { PortalHost } from 'react-native-teleport';

import { cleanupAnimatedIndex, getAnimatedIndex } from './animatedRegistry';
import { BottomSheetContext } from './BottomSheet.context';
import {
  useSheetContent,
  useSheetKeepMounted,
  useSheetPortalSession,
  useSheetUsePortal,
} from './bottomSheet.store';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { cleanupSheetRef } from './refsMap';
import { useSheetScaleAnimatedStyle } from './useScaleAnimation';

interface QueueItemProps {
  id: string;
  stackIndex: number;
  isActive: boolean;
}

export const QueueItem = memo(function QueueItem({
  id,
  stackIndex,
  isActive,
}: QueueItemProps) {
  const content = useSheetContent(id);
  const usePortal = useSheetUsePortal(id);
  const keepMounted = useSheetKeepMounted(id);
  const portalSession = useSheetPortalSession(id);

  const { width, height } = useSafeAreaFrame();

  const animatedIndex = getAnimatedIndex(id);

  useEffect(() => {
    return () => {
      cleanupSheetRef(id);
      cleanupAnimatedIndex(id);
    };
  }, [id, keepMounted]);

  const backdropZIndex = stackIndex * 2;
  const contentZIndex = stackIndex * 2 + 1;

  if (!animatedIndex) {
    return null;
  }

  return (
    <>
      {isActive && (
        <View
          style={[StyleSheet.absoluteFillObject, { zIndex: backdropZIndex }]}
          pointerEvents="box-none"
        >
          <BottomSheetBackdrop sheetId={id} />
        </View>
      )}

      <ScaleWrapper id={id} zIndex={contentZIndex}>
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
      </ScaleWrapper>
    </>
  );
});

const ScaleWrapper = ({
  id,
  zIndex,
  children,
}: PropsWithChildren<{
  id: string;
  zIndex: number;
}>) => {
  const scaleStyle = useSheetScaleAnimatedStyle(id);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, { zIndex }, scaleStyle]}
    >
      {children}
    </Animated.View>
  );
};
