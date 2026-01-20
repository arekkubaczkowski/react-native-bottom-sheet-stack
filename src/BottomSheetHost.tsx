import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { shallow } from 'zustand/shallow';
import { cleanupAnimatedIndex } from './animatedRegistry';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';
import {
  useScaleAnimatedStyle,
  useScaleDepth,
  type ScaleConfig,
} from './useScaleAnimation';

function BottomSheetHostComp() {
  const queueIds = useQueueIds();
  const clearAll = useBottomSheetStore((store) => store.clearAll);

  const { groupId, scaleConfig } = useBottomSheetManagerContext();

  useEffect(() => {
    const unsubscribe = initBottomSheetCoordinator(groupId);
    return () => {
      unsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  return (
    <>
      {queueIds.map((id) => (
        <QueueItem
          key={id}
          id={id}
          groupId={groupId}
          scaleConfig={scaleConfig}
        />
      ))}
    </>
  );
}

const QueueItem = React.memo(
  ({
    id,
    groupId,
    scaleConfig,
  }: {
    id: string;
    groupId: string;
    scaleConfig?: ScaleConfig;
  }) => {
    const content = useBottomSheetStore(
      (state) => state.sheetsById[id]?.content
    );

    const { width, height } = useSafeAreaFrame();
    const value = useMemo(() => ({ id }), [id]);

    const scaleDepth = useScaleDepth(groupId, id);
    const scaleStyle = useScaleAnimatedStyle(scaleDepth, scaleConfig);

    // Cleanup animated index when sheet is unmounted
    useEffect(() => {
      return () => {
        cleanupAnimatedIndex(id);
      };
    }, [id]);

    return (
      <BottomSheetContext.Provider value={value}>
        {/* Backdrop - rendered without scaling */}
        <View style={[StyleSheet.absoluteFillObject, styles.backdropContainer]}>
          <BottomSheetBackdrop sheetId={id} />
        </View>

        {/* Sheet content - rendered with scaling */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.container,
            { width, height },
            scaleStyle,
          ]}
        >
          {content}
        </Animated.View>
      </BottomSheetContext.Provider>
    );
  }
);

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

export const BottomSheetHost = React.memo(BottomSheetHostComp);

const styles = StyleSheet.create({
  backdropContainer: {
    zIndex: 99_999_999,
  },
  container: {
    zIndex: 100_000_000,
    pointerEvents: 'box-none',
  },
});
