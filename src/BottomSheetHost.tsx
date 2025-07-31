import React, {
  Fragment,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';

initBottomSheetCoordinator();

interface BottomSheetHostProps {
  Container?: React.ComponentType<any>;
}

function BottomSheetHostComp({ Container = Fragment }: BottomSheetHostProps) {
  const { bottomSheetsStack, clearAll } = useBottomSheetStore((store) => ({
    bottomSheetsStack: store.stack,
    clearAll: store.clearAll,
  }));

  const { width, height } = useSafeAreaFrame();
  const { groupId } = useBottomSheetManagerContext();

  const filteredQueue = useMemo(
    () =>
      bottomSheetsStack.filter(
        (bottomSheet) => bottomSheet.groupId === groupId
      ),
    [bottomSheetsStack, groupId]
  );

  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  return (
    <>
      {filteredQueue.map(({ id, content }) => (
        <BottomSheetContext.Provider key={id} value={{ id }}>
          <Container>
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
              <MemoizedContent id={id}>{content}</MemoizedContent>
            </View>
          </Container>
        </BottomSheetContext.Provider>
      ))}
    </>
  );
}

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
