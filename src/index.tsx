// Components
export { BottomSheetManagerProvider } from './BottomSheetManager.provider';
export { BottomSheetHost } from './BottomSheetHost';
export { BottomSheetScaleView } from './BottomSheetScaleView';
export { BottomSheetManaged, type BottomSheetRef } from './BottomSheetManaged';
export { BottomSheetPortal } from './BottomSheetPortal';
export { BottomSheetPersistent } from './BottomSheetPersistent';

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

// Testing utilities (internal use)
export { __resetSheetRefs } from './refsMap';
export { __resetAnimatedIndexes } from './animatedRegistry';
export { __resetPortalSessions } from './portalSessionRegistry';
