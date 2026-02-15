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
} from './adapters/gorhom';
export { ModalAdapter, type ModalAdapterProps } from './adapters/modal';
export {
  ReactNativeModalAdapter,
  type ReactNativeModalAdapterProps,
} from './adapters/react-native-modal';
export {
  TrueSheetAdapter,
  type TrueSheetAdapterProps,
} from './adapters/true-sheet';
export {
  ActionsSheetAdapter,
  type ActionsSheetAdapterProps,
} from './adapters/actions-sheet';
export {
  RawBottomSheetAdapter,
  type RawBottomSheetAdapterProps,
} from './adapters/raw-bottom-sheet';

// Adapter types
export type {
  SheetAdapterRef,
  SheetAdapterEvents,
  SheetRef,
} from './adapter.types';

// Coordinator (for custom adapter authors)
export { createSheetEventHandlers } from './bottomSheetCoordinator';

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
