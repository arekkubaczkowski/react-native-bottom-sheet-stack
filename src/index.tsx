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
  SheetAdapterEvents,
  SheetRef,
} from './adapter.types';

// ---------------------------------------------------------------------------
// Adapter utilities
//
// Everything a custom adapter needs to reach parity with the built-in ones —
// whatever the shipped adapters use, a third-party one can use too.
// ---------------------------------------------------------------------------
export {
  createSheetEventHandlers,
  requestClose,
  closeAllAnimated,
} from './bottomSheetCoordinator';
export { useAdapterRef } from './useAdapterRef';
export { useAnimatedIndex } from './useAnimatedIndex';
export { useBackHandler } from './useBackHandler';
/**
 * `useSetBackdrop` suppresses the manager's shared backdrop for a sheet — for
 * adapters that render their own and would otherwise stack two.
 * `useSheetPreventDismiss` reports whether an `onBeforeClose` interceptor is
 * blocking dismissal, so the adapter can disable its native gestures.
 */
export { useSetBackdrop, useSheetPreventDismiss } from './store';

// Hooks
export { useBottomSheetManager } from './useBottomSheetManager';
export {
  useBottomSheetControl,
  type UseBottomSheetControlReturn,
} from './useBottomSheetControl';
export {
  useBottomSheetContext,
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
  OpenResult,
  OpenRejectionReason,
  CloseResult,
  CloseRejectionReason,
  CascadeOptions,
  CloseAllResult,
  PublicBottomSheetState as BottomSheetState,
} from './store';
export type {
  BottomSheetPortalRegistry,
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

// onBeforeClose registry
export type { OnBeforeCloseCallback } from './onBeforeCloseRegistry';
export { setOnBeforeClose, removeOnBeforeClose } from './onBeforeCloseRegistry';

/**
 * Direct access to the Zustand store.
 *
 * @internal Not covered by semver. The state shape and the action set are
 * implementation details — `stackOrderByGroup`, `content`, `portalSession` and
 * the lifecycle actions (`markOpen`, `finishClosing`, `mount`, `unmount`) exist
 * to serve the coordinator and can change without a major bump. Prefer
 * `useBottomSheetStatus`, `useBottomSheetContext` and `useBottomSheetControl`.
 */
export { useBottomSheetStore } from './store';

// Test helpers live on the `/testing` subpath, so they stay out of the
// production bundle. See src/testing.ts.
