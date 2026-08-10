import { memo, useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { PortalHost } from 'react-native-teleport';

import { cleanupAnimatedIndex, getAnimatedIndex } from './animatedRegistry';
import { BottomSheetContext } from './BottomSheet.context';
import {
  useSheetBackdropEnabled,
  useSheetContent,
  useSheetPortalSession,
  useSheetUsePortal,
} from './store';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { removeOnBeforeClose } from './onBeforeCloseRegistry';
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
  const portalSession = useSheetPortalSession(id);
  const backdropEnabled = useSheetBackdropEnabled(id);

  const { width, height } = useSafeAreaFrame();

  const animatedIndex = getAnimatedIndex(id);

  useEffect(() => {
    return () => {
      cleanupSheetRef(id);
      cleanupAnimatedIndex(id);
      removeOnBeforeClose(id);
    };
  }, [id]);

  // High enough that sheets outrank anything the host app stacks — z-index is
  // only comparable within a stacking context, and the manager's layer sits
  // alongside app content that is free to use its own values.
  const baseZIndex = 100_000_000;

  const backdropZIndex = baseZIndex + stackIndex * 2;
  const contentZIndex = baseZIndex + stackIndex * 2 + 1;

  if (!animatedIndex) {
    return null;
  }

  return (
    <>
      {isActive && backdropEnabled && (
        <View
          style={[StyleSheet.absoluteFill, { zIndex: backdropZIndex }]}
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
      style={[StyleSheet.absoluteFill, { zIndex }, scaleStyle]}
    >
      {children}
    </Animated.View>
  );
};
