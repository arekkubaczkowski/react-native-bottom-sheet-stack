import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Platform, type NativeSyntheticEvent } from 'react-native';
import { useEvent, useHandler } from 'react-native-reanimated';
import type {
  Detent,
  PositionChangeEventData,
} from '@swmansion/react-native-bottom-sheet';

import type { SheetAdapterRef } from '../../adapter.types';
import { useBottomSheetDefaultIndex } from '../../BottomSheetDefaultIndex.context';
import {
  createSheetEventHandlers,
  getSheetStatus,
} from '../../bottomSheetCoordinator';
import { useAnimatedIndex } from '../../useAnimatedIndex';
import { useBackHandler } from '../../useBackHandler';
import { CLOSED_INDEX, isClosedDetent } from './detents';
import type { SwmansionSheetAdapterProps } from './SwmansionSheetAdapter';

const DEFAULT_SETTLE_MS = 450;
const SETTLE_WATCHDOG_MARGIN_MS = 1000;
const SETTLE_WATCHDOG_RETRIES = 4;
const DETENT_EPSILON = 0.01;

function resolveOpenIndex(
  expandedIndex: number | undefined,
  lastIndex: number
): number {
  if (expandedIndex === undefined || !Number.isInteger(expandedIndex)) {
    return lastIndex;
  }
  return Math.min(Math.max(expandedIndex, 1), lastIndex);
}

type MotionProps = Pick<
  SwmansionSheetAdapterProps,
  | 'expandedIndex'
  | 'onIndexChange'
  | 'onSettle'
  | 'animatedPosition'
  | 'settleDuration'
>;

export function useSwmansionMotion(
  id: string,
  ref: Ref<SheetAdapterRef> | undefined,
  detents: Detent[],
  {
    expandedIndex,
    onIndexChange,
    onSettle,
    animatedPosition,
    settleDuration,
  }: MotionProps
) {
  const animatedIndex = useAnimatedIndex();
  const lastIndex = Math.max(detents.length - 1, CLOSED_INDEX);
  const openIndex = resolveOpenIndex(expandedIndex, lastIndex);
  const { handleDismiss, handleOpened, handleClosed } =
    createSheetEventHandlers(id);

  useBackHandler(id, handleDismiss);

  const defaultIndex = useBottomSheetDefaultIndex();
  const [index, setIndex] = useState(() =>
    defaultIndex < 0 ? CLOSED_INDEX : openIndex
  );

  // SWM validates the index during render, so clamp before rendering the sheet.
  const safeIndex = Math.min(index, lastIndex);
  if (safeIndex !== index) {
    setIndex(safeIndex);
  }

  // An explicit prop change moves an open sheet. Detent growth alone does not.
  const [previousExpandedIndex, setPreviousExpandedIndex] =
    useState(expandedIndex);
  if (!Object.is(expandedIndex, previousExpandedIndex)) {
    setPreviousExpandedIndex(expandedIndex);
    if (safeIndex !== CLOSED_INDEX) {
      setIndex(openIndex);
    }
  }

  // A commit or gesture changes the target before a settle confirms it.
  const targetIndexRef = useRef(safeIndex);
  const settledIndexRef = useRef<number | null>(null);
  const openReportedRef = useRef(false);

  useLayoutEffect(() => {
    // A detent shrink clamps the native target without emitting a settle.
    if (targetIndexRef.current > lastIndex) {
      targetIndexRef.current = lastIndex;
      if (settledIndexRef.current !== null) {
        settledIndexRef.current = Math.min(settledIndexRef.current, lastIndex);
      }
    }
    if (targetIndexRef.current !== safeIndex) {
      targetIndexRef.current = safeIndex;
      settledIndexRef.current = null;
    }
  }, [safeIndex, lastIndex]);

  const announceOpen = () => {
    if (!openReportedRef.current) {
      openReportedRef.current = true;
      onIndexChange?.(openIndex, CLOSED_INDEX);
    }
  };

  const reportSettled = (settledIndex: number) => {
    settledIndexRef.current = settledIndex;
    const status = getSheetStatus(id);

    // Correct a gesture when its destination conflicts with the live store.
    if (isClosedDetent(detents[settledIndex])) {
      if (status === 'closing') {
        handleClosed();
      } else if (status === 'open' || status === 'opening') {
        setIndex(openIndex);
        announceOpen();
      }
    } else if (status === 'closing' || status === 'hidden') {
      setIndex(CLOSED_INDEX);
      openReportedRef.current = false;
      onIndexChange?.(CLOSED_INDEX, settledIndex);
    } else {
      handleOpened();
    }
  };

  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
    },
    []
  );

  // Fabric can merge a drive and its reversal into a commit that emits no settle.
  const armSettleWatchdog = (target: number) => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
    }
    let retries = SETTLE_WATCHDOG_RETRIES;
    const check = () => {
      watchdogRef.current = null;
      if (
        targetIndexRef.current !== target ||
        settledIndexRef.current !== null
      ) {
        return;
      }
      const backdropIndex = animatedIndex.get();
      const atTarget = Math.abs(backdropIndex - (target - 1)) < DETENT_EPSILON;
      const atDetent =
        Math.abs(backdropIndex - Math.round(backdropIndex)) < DETENT_EPSILON;
      // After the retries, accept any detent. Keep waiting between detents.
      if (!atTarget && (retries > 0 || !atDetent)) {
        retries = Math.max(retries - 1, 0);
        watchdogRef.current = setTimeout(check, SETTLE_WATCHDOG_MARGIN_MS);
        return;
      }
      reportSettled(target);
    };
    watchdogRef.current = setTimeout(
      check,
      (settleDuration ?? DEFAULT_SETTLE_MS) + SETTLE_WATCHDOG_MARGIN_MS
    );
  };

  // An already-settled target emits nothing. Read refs because batched
  // expand/close calls can leave the controlled prop unchanged.
  const drive = (target: number) => {
    setIndex(target);
    if (
      targetIndexRef.current === target &&
      settledIndexRef.current === target
    ) {
      reportSettled(target);
      return;
    }
    armSettleWatchdog(target);
  };

  useImperativeHandle(ref, () => ({
    expand: () => {
      announceOpen();
      drive(openIndex);
    },
    close: () => {
      openReportedRef.current = false;
      drive(CLOSED_INDEX);
    },
  }));

  const handleNativeSettle = (reportedIndex: number) => {
    // A queued settle can predate a detent shrink or a newer target.
    const settledIndex = Math.min(reportedIndex, lastIndex);
    if (settledIndex === targetIndexRef.current) {
      reportSettled(settledIndex);
    }
    onSettle?.(reportedIndex);
  };

  const handleNativeIndexChange = (nextIndex: number) => {
    const prevIndex = targetIndexRef.current;
    targetIndexRef.current = nextIndex;
    settledIndexRef.current = null;
    // Mirror the gesture so a later command can drive back to the old prop.
    setIndex(nextIndex);
    if (isClosedDetent(detents[nextIndex])) {
      openReportedRef.current = false;
      handleDismiss();
    }
    if (nextIndex !== prevIndex) {
      onIndexChange?.(nextIndex, prevIndex);
    }
  };

  const updatePosition = (event: PositionChangeEventData) => {
    'worklet';
    animatedIndex.set(event.index - 1);
    animatedPosition?.set(event.position);
  };
  const { doDependenciesDiffer } = useHandler(
    { onPositionChange: updatePosition },
    Platform.OS === 'web' ? [animatedIndex, animatedPosition] : undefined
  );

  const onPositionChange = useEvent<
    NativeSyntheticEvent<PositionChangeEventData>
  >(updatePosition, ['onPositionChange'], doDependenciesDiffer);

  return {
    index: safeIndex,
    openIndex,
    lastIndex,
    onIndexChange: handleNativeIndexChange,
    onSettle: handleNativeSettle,
    onPositionChange,
  };
}
