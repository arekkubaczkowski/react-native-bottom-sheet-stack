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
  AdapterBackdropProps,
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
export { useAdapterBackdrop } from './useAdapterBackdrop';
export { useAdapterRef } from './useAdapterRef';
export { useAnimatedIndex } from './useAnimatedIndex';
export { useBackHandler } from './useBackHandler';
/**
 * `useSetBackdrop` sets a sheet's backdrop override imperatively: `false`
 * suppresses the manager's shared backdrop (for adapters that render their
 * own and would otherwise stack two), a `BackdropConfig` restyles or replaces
 * it, `true` clears the override. Adapters exposing a `backdrop` prop should
 * prefer `useAdapterBackdrop`, which handles the effect plumbing.
 * `useSheetPreventDismiss` reports whether an `onBeforeClose` interceptor is
 * blocking dismissal, so the adapter can disable its native gestures.
 */
export { useSetBackdrop, useSheetPreventDismiss } from './store';
/**
 * The animated index of a fully hidden sheet (`-1`) — the low end of the
 * interpolation range a custom backdrop component fades across.
 */
export { HIDDEN_ANIMATED_INDEX } from './animatedRegistry';

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
export type { BackdropConfig, BackdropComponentProps } from './backdrop.types';
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
