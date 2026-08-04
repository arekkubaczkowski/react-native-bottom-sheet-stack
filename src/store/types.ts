import { type ReactNode } from 'react';

export type BottomSheetStatus = 'opening' | 'open' | 'closing' | 'hidden';
export type OpenMode = 'push' | 'switch' | 'replace';

/**
 * Full internal record for a sheet.
 *
 * @internal Implementation detail of the store — `content`, `portalSession` and
 * `preventDismiss` exist to serve the coordinator and the portal plumbing. The
 * shape consumers should rely on is {@link PublicBottomSheetState}.
 */
export interface BottomSheetState {
  groupId: string;
  id: string;
  content?: ReactNode;
  status: BottomSheetStatus;
  scaleBackground?: boolean;
  backdrop?: boolean;
  usePortal?: boolean;
  params?: Record<string, unknown>;
  keepMounted?: boolean;
  /**
   * Incremented each time a portal-based sheet is opened.
   * Used to create unique Portal/PortalHost names to work around
   * react-native-teleport connection issues after replace flows.
   */
  portalSession?: number;
  /**
   * When true, the adapter should block user-initiated dismiss gestures
   * (swipe down, backdrop tap). Set by `useOnBeforeClose` to ensure the
   * interceptor runs before closing. Programmatic close via `forceClose()`
   * bypasses this.
   */
  preventDismiss?: boolean;
}

/**
 * The part of a sheet's state that is stable public API.
 *
 * Anything omitted here is implementation detail and may change in a minor
 * release.
 */
export type PublicBottomSheetState = Pick<
  BottomSheetState,
  'id' | 'groupId' | 'status' | 'params' | 'scaleBackground' | 'keepMounted'
>;

export type TriggerState = Omit<BottomSheetState, 'status'>;

/** Why an `open()` call did not put the sheet on the stack. */
export type OpenRejectionReason =
  /** The sheet is already on the stack — re-opening an open sheet is a no-op. */
  | 'already-active'
  /** Another sheet in the same group is still animating open. */
  | 'group-busy';

/**
 * Outcome of an `open()` call. `opened: false` means the store deliberately
 * ignored the request — see {@link OpenRejectionReason}.
 */
export type OpenResult =
  | { opened: true; id: string }
  | { opened: false; id: string; reason: OpenRejectionReason };

export interface BottomSheetStoreState {
  sheetsById: Record<string, BottomSheetState>;
  /**
   * Visible sheet IDs, topmost last, keyed by group.
   *
   * Keyed rather than flat so group isolation is structural: an operation
   * cannot reach a sheet in another group by walking the stack, because it
   * never holds another group's stack to begin with.
   */
  stackOrderByGroup: Record<string, string[]>;
}

export interface BottomSheetStoreActions {
  open(sheet: TriggerState, mode?: OpenMode): OpenResult;
  markOpen(id: string): void;
  startClosing(id: string): void;
  finishClosing(id: string): void;
  updateParams(id: string, params: Record<string, unknown> | undefined): void;
  setPreventDismiss(id: string, prevent: boolean): void;
  setBackdrop(id: string, backdrop: boolean): void;
  clearGroup(groupId: string): void;
  clearAll(): void;
  mount(sheet: TriggerState): void;
  unmount(id: string): void;
}

export type BottomSheetStore = BottomSheetStoreState & BottomSheetStoreActions;
