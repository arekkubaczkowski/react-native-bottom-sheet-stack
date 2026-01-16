import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { shallow } from 'zustand/shallow';
import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';

function BottomSheetHostComp() {
  const queueIds = useQueueIds();
  const clearAll = useBottomSheetStore((store) => store.clearAll);

  const { groupId } = useBottomSheetManagerContext();

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
        <QueueItem key={id} id={id} />
      ))}
    </>
  );
}

const QueueItem = React.memo(({ id }: { id: string }) => {
  const content = useBottomSheetStore((state) => state.sheetsById[id]?.content);

  const { width, height } = useSafeAreaFrame();
  const value = useMemo(() => ({ id }), [id]);

  return (
    <BottomSheetContext.Provider value={value}>
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.container,
          {
            width,
            height,
          },
        ]}
      >
        {content}
      </View>
    </BottomSheetContext.Provider>
  );
});

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
  container: {
    zIndex: 100_000_000,
    pointerEvents: 'box-none',
  },
});
