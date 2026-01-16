import React, { useEffect, useMemo, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { shallow } from 'zustand/shallow';
import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';

function BottomSheetHostComp() {
  const queue = useQueue();
  const clearAll = useBottomSheetStore((store) => store.clearAll, shallow);

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
      {queue.map(({ id, content }) => (
        <QueueItem key={id} id={id} content={content} />
      ))}
    </>
  );
}

const QueueItem = ({
  id,
  content,
}: PropsWithChildren<{
  id: string;
  content: React.ReactNode;
}>) => {
  const { width, height } = useSafeAreaFrame();
  const value = useMemo(() => ({ id }), [id]);

  return (
    <BottomSheetContext.Provider key={id} value={value}>
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
        <MemoizedContent id={id}>
          <>
            {console.log('Rendering BottomSheetHost Content', id)}
            {content}
          </>
        </MemoizedContent>
      </View>
    </BottomSheetContext.Provider>
  );
};

const useQueue = () => {
  const { groupId } = useBottomSheetManagerContext();

  const bottomSheetsStack = useBottomSheetStore(
    (store) => store.stack,
    shallow
  );

  const filteredQueue = useMemo(
    () =>
      bottomSheetsStack.filter(
        (bottomSheet) => bottomSheet.groupId === groupId
      ),
    [bottomSheetsStack, groupId]
  );

  return filteredQueue;
};

const MemoizedContent = React.memo(
  ({ children }: PropsWithChildren<{ id: string }>) => <>{children}</>,
  (prevProps, nextProps) => {
    return prevProps.id === nextProps.id;
  }
);

export const BottomSheetHost = React.memo(BottomSheetHostComp);

const styles = StyleSheet.create({
  container: {
    zIndex: 100_000_000,
    pointerEvents: 'box-none',
  },
});
