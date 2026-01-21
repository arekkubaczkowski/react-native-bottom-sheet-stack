import { useEffect } from 'react';

import { useBottomSheetStore } from './bottomSheet.store';
import { initBottomSheetCoordinator } from './bottomSheetCoordinator';
import { useBottomSheetManagerContext } from './BottomSheetManager.provider';
import { QueueItem } from './QueueItem';
import { useSheetRenderData } from './useSheetRenderData';

export function BottomSheetHost() {
  const sheetRenderData = useSheetRenderData();
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
      {sheetRenderData.map(({ id, stackIndex, isActive }) => (
        <QueueItem
          key={id}
          id={id}
          stackIndex={stackIndex}
          isActive={isActive}
        />
      ))}
    </>
  );
}
