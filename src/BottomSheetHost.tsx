import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { PortalHost } from 'react-native-teleport';

import { shallow } from 'zustand/shallow';
import { cleanupAnimatedIndex } from './animatedRegistry';
import { cleanupSheetRef } from './refsMap';
import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';
import { useScaleAnimatedStyle, type ScaleConfig } from './useScaleAnimation';

function PortalHostWrapper({
  id,
  width,
  height,
}: {
  id: string;
  width: number;
  height: number;
}) {
  return (
    <View style={{ flex: 1, width, height }} pointerEvents="box-none">
      <PortalHost name={`bottomsheet-${id}`} style={{ width, height }} />
    </View>
  );
}

function BottomSheetHostComp() {
  const queueIds = useQueueIds();
  const clearGroup = useBottomSheetStore((store) => store.clearGroup);

  const { groupId, scaleConfig } = useBottomSheetManagerContext();

  useEffect(() => {
    const unsubscribe = initBottomSheetCoordinator(groupId);
    return () => {
      unsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    return () => {
      clearGroup(groupId);
    };
  }, [clearGroup, groupId]);

  return (
    <>
      {queueIds.map((id, index) => (
        <QueueItem
          key={id}
          id={id}
          groupId={groupId}
          scaleConfig={scaleConfig}
          stackIndex={index}
        />
      ))}
    </>
  );
}

function QueueItem({
  id,
  groupId,
  scaleConfig,
  stackIndex,
}: {
  id: string;
  groupId: string;
  scaleConfig?: ScaleConfig;
  stackIndex: number;
}) {
  const sheet = useBottomSheetStore((state) => state.sheetsById[id]);
  const startClosing = useBottomSheetStore((state) => state.startClosing);

  const { width, height } = useSafeAreaFrame();
  const value = { id };

  const scaleStyle = useScaleAnimatedStyle({ groupId, id }, scaleConfig);

  useEffect(() => {
    return () => {
      cleanupSheetRef(id);
      cleanupAnimatedIndex(id);
    };
  }, [id]);

  const backdropZIndex = stackIndex * 2;
  const contentZIndex = stackIndex * 2 + 1;

  return (
    <BottomSheetContext.Provider value={value}>
      <View style={[StyleSheet.absoluteFillObject, { zIndex: backdropZIndex }]}>
        <BottomSheetBackdrop sheetId={id} onPress={() => startClosing(id)} />
      </View>

      {/* Sheet content - rendered with scaling */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.container,
          { width, height, zIndex: contentZIndex },
          scaleStyle,
        ]}
      >
        {sheet?.usePortal ? (
          <PortalHostWrapper id={id} width={width} height={height} />
        ) : (
          sheet?.content
        )}
      </Animated.View>
    </BottomSheetContext.Provider>
  );
}

const useQueueIds = () => {
  const { groupId } = useBottomSheetManagerContext();

  return useBottomSheetStore(
    (state) =>
      state.stackOrder.filter(
        (sheetId) => state.sheetsById[sheetId]?.groupId === groupId
      ),
    shallow
  );
};

export const BottomSheetHost = BottomSheetHostComp;

const styles = StyleSheet.create({
  container: {
    pointerEvents: 'box-none',
  },
});
