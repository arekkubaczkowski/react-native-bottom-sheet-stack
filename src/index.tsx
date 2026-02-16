// Components
export { BottomSheetManagerProvider } from './BottomSheetManager.provider';
export { BottomSheetHost } from './BottomSheetHost';
export { BottomSheetScaleView } from './BottomSheetScaleView';
export { BottomSheetPortal } from './BottomSheetPortal';
export { BottomSheetPersistent } from './BottomSheetPersistent';

// Adapters (only those with zero 3rd-party deps)
export {
  CustomModalAdapter,
  type ModalAdapterProps,
} from './adapters/custom-modal';

// Adapter types
export type {
  SheetAdapterRef,
  SheetAdapterRef as BottomSheetRef,
  SheetAdapterEvents,
  SheetRef,
} from './adapter.types';

// Adapter utilities (for custom adapter authors)
export {
  createSheetEventHandlers,
  requestClose,
  closeAllAnimated,
} from './bottomSheetCoordinator';
export { useAdapterRef } from './useAdapterRef';
export { useAnimatedIndex } from './useAnimatedIndex';
export { useBackHandler } from './useBackHandler';
export { getAnimatedIndex, setAnimatedIndexValue } from './animatedRegistry';

// Hooks
export {
  useBottomSheetManager,
  type CloseAllOptions,
} from './useBottomSheetManager';
export {
  useBottomSheetControl,
  type UseBottomSheetControlReturn,
} from './useBottomSheetControl';
export {
  useBottomSheetContext,
  useBottomSheetState,
  type UseBottomSheetContextReturn,
} from './useBottomSheetContext';
export {
  useBottomSheetStatus,
  type UseBottomSheetStatusReturn,
} from './useBottomSheetStatus';
export { useOnBeforeClose } from './useOnBeforeClose';

// Types
export type { ScaleConfig, ScaleAnimationConfig } from './useScaleAnimation';
export type {
  BottomSheetStatus,
  OpenMode,
  BottomSheetState,
} from './bottomSheet.store';
export type {
  BottomSheetPortalRegistry,
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

export { useBottomSheetStore } from './bottomSheet.store';

// onBeforeClose registry
export type { OnBeforeCloseCallback } from './onBeforeCloseRegistry';
export { setOnBeforeClose, removeOnBeforeClose } from './onBeforeCloseRegistry';

// Testing utilities (internal use)
export { __resetSheetRefs } from './refsMap';
export {
  __resetAnimatedIndexes,
  __getAllAnimatedIndexes,
} from './animatedRegistry';
export { __resetPortalSessions } from './portalSessionRegistry';
export { __resetOnBeforeClose } from './onBeforeCloseRegistry';
