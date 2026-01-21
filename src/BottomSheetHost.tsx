import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { PortalHost } from 'react-native-teleport';

import { shallow } from 'zustand/shallow';
import { cleanupAnimatedIndex } from './animatedRegistry';
import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';
import { cleanupSheetRef } from './refsMap';
import { useScaleAnimatedStyle } from './useScaleAnimation';

function PortalHostWrapper({
  id,
  width,
  height,
}: {
  id: string;
  width: number;
  height: number;
}) {
  return <PortalHost name={`bottomsheet-${id}`} style={{ width, height }} />;
}

function BottomSheetHostComp() {
  const { activeIds, hiddenKeepMountedIds } = useAllSheetIds();
  const clearGroup = useBottomSheetStore((store) => store.clearGroup);

  const { groupId } = useBottomSheetManagerContext();

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
      {hiddenKeepMountedIds.map((id) => (
        <QueueItem key={id} id={id} stackIndex={-1} isActive={false} />
      ))}
      {activeIds.map((id, index) => (
        <QueueItem key={id} id={id} stackIndex={index} isActive={true} />
      ))}
    </>
  );
}

function QueueItem({
  id,
  stackIndex,
  isActive,
}: {
  id: string;
  stackIndex: number;
  isActive: boolean;
}) {
  const { content, usePortal, startClosing, keepMounted } = useBottomSheetStore(
    (state) => ({
      content: state.sheetsById[id]?.content,
      usePortal: state.sheetsById[id]?.usePortal,
      keepMounted: state.sheetsById[id]?.keepMounted,
      startClosing: state.startClosing,
    }),
    shallow
  );

  const { width, height } = useSafeAreaFrame();
  const value = { id };
  const scaleStyle = useScaleAnimatedStyle({ id });

  useEffect(() => {
    return () => {
      if (!keepMounted) {
        cleanupSheetRef(id);
        cleanupAnimatedIndex(id);
      }
    };
  }, [id, keepMounted]);

  const backdropZIndex = stackIndex * 2;
  const contentZIndex = stackIndex * 2 + 1;

  return (
    <BottomSheetContext.Provider value={value}>
      {isActive && (
        <View
          style={[StyleSheet.absoluteFillObject, { zIndex: backdropZIndex }]}
          pointerEvents="box-none"
        >
          <BottomSheetBackdrop sheetId={id} onPress={() => startClosing(id)} />
        </View>
      )}

      {/* Sheet content - rendered with scaling */}
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
          <PortalHostWrapper id={id} width={width} height={height} />
        ) : (
          content
        )}
      </Animated.View>
    </BottomSheetContext.Provider>
  );
}

const useAllSheetIds = () => {
  const { groupId } = useBottomSheetManagerContext();

  return useBottomSheetStore((state) => {
    // Active sheets from stackOrder
    const activeIds = state.stackOrder.filter(
      (sheetId) => state.sheetsById[sheetId]?.groupId === groupId
    );

    // Hidden keepMounted sheets (in sheetsById but not in stackOrder)
    const stackOrderSet = new Set(state.stackOrder);
    const hiddenKeepMountedIds = Object.keys(state.sheetsById).filter(
      (sheetId) => {
        const sheet = state.sheetsById[sheetId];
        return (
          sheet &&
          sheet.groupId === groupId &&
          sheet.keepMounted &&
          sheet.status === 'hidden' &&
          !stackOrderSet.has(sheetId)
        );
      }
    );

    return { activeIds, hiddenKeepMountedIds };
  }, shallow);
};

export const BottomSheetHost = BottomSheetHostComp;

const styles = StyleSheet.create({
  container: {},
});
