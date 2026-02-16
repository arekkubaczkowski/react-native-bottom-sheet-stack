// Components
export { BottomSheetManagerProvider } from './BottomSheetManager.provider';
export { BottomSheetHost } from './BottomSheetHost';
export { BottomSheetScaleView } from './BottomSheetScaleView';
export { BottomSheetManaged, type BottomSheetRef } from './BottomSheetManaged';
export { BottomSheetPortal } from './BottomSheetPortal';
export { BottomSheetPersistent } from './BottomSheetPersistent';

// Adapters
export {
  GorhomSheetAdapter,
  type GorhomSheetAdapterProps,
} from './adapters/gorhom-sheet';
export {
  CustomModalAdapter,
  type ModalAdapterProps,
} from './adapters/custom-modal';
/** @deprecated Use `CustomModalAdapter` instead. */
export { ModalAdapter } from './adapters/custom-modal';
export {
  ReactNativeModalAdapter,
  type ReactNativeModalAdapterProps,
} from './adapters/react-native-modal';
export {
  ActionsSheetAdapter,
  type ActionsSheetAdapterProps,
} from './adapters/actions-sheet';

// Adapter types
export type {
  SheetAdapterRef,
  SheetAdapterEvents,
  SheetRef,
} from './adapter.types';

// Adapter utilities (for custom adapter authors)
export { createSheetEventHandlers } from './bottomSheetCoordinator';
export { useAdapterRef } from './useAdapterRef';
export { useAnimatedIndex } from './useAnimatedIndex';
export { useBackHandler } from './useBackHandler';
export { getAnimatedIndex, setAnimatedIndexValue } from './animatedRegistry';

// Hooks
export { useBottomSheetManager } from './useBottomSheetManager';
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

// Testing utilities (internal use)
export { __resetSheetRefs } from './refsMap';
export {
  __resetAnimatedIndexes,
  __getAllAnimatedIndexes,
} from './animatedRegistry';
export { __resetPortalSessions } from './portalSessionRegistry';
