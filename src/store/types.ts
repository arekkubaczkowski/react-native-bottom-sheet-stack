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
   * Allocated per portal connection: once at `mount()` for a persistent sheet,
   * and on every open for a non-persistent portal sheet. Used to create unique
   * Portal/PortalHost names to work around react-native-teleport connection
   * issues after replace flows.
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

/** Fields every open payload carries, regardless of how the sheet renders. */
interface OpenPayloadBase {
  id: string;
  groupId: string;
  scaleBackground?: boolean;
  backdrop?: boolean;
  params?: Record<string, unknown>;
}

/**
 * What `open()` accepts, as a discriminated union of the modes the library
 * actually documents.
 *
 * The alternative — a single bag with optional `content` / `usePortal` /
 * `keepMounted` — can express eight combinations of which only three are real,
 * and forces callers to pass `content: null` just to signal "not inline".
 *
 * `persistent` is not a variant here: a persistent sheet is registered with
 * `mount()` and re-opened as `portal`, keeping the `keepMounted` flag its
 * store record already carries.
 */
export type OpenPayload =
  | (OpenPayloadBase & {
      /** Content supplied at call time; unmounted on close. */
      kind: 'inline';
      content: ReactNode;
    })
  | (OpenPayloadBase & {
      /** Content declared elsewhere and teleported in, preserving context. */
      kind: 'portal';
    });

/** What `mount()` accepts — a persistent sheet, pre-registered as hidden. */
export type MountPayload = OpenPayloadBase;

/** Why an `open()` call did not put the sheet on the stack. */
export type OpenRejectionReason =
  /** The sheet is already on the stack — re-opening an open sheet is a no-op. */
  | 'already-active'
  /** Another sheet in the same group is still animating open. */
  | 'group-busy'
  /**
   * The sheet is registered to a different group than the one opening it. A
   * sheet belongs to the group that mounted it; moving it is not supported.
   */
  | 'group-mismatch';

/**
 * Outcome of an `open()` call. `opened: false` means the store deliberately
 * ignored the request — see {@link OpenRejectionReason}.
 */
export type OpenResult =
  | { opened: true; id: string }
  | { opened: false; id: string; reason: OpenRejectionReason };

/** Why a close did not happen. */
export type CloseRejectionReason =
  /** An `onBeforeClose` interceptor declined. */
  | 'blocked'
  /** The interceptor threw; the close is cancelled for safety. */
  | 'interceptor-error'
  /**
   * There was nothing to close: the sheet is already closing, is hidden, or
   * the store has no record of it. Distinct from `blocked` — no interceptor
   * had an opinion.
   */
  | 'not-closable';

/**
 * Outcome of a close. Carries a reason rather than a bare boolean, because
 * "the user declined" and "there was nothing to close" are different answers
 * and callers routinely need to tell them apart.
 */
export type CloseResult =
  | { closed: true }
  | { closed: false; reason: CloseRejectionReason };

/** Outcome of a cascading close. */
export interface CloseAllResult {
  /** Whether every sheet in the group closed. */
  closedAll: boolean;
  /** IDs that closed, topmost first. */
  closed: string[];
  /**
   * The sheet whose interceptor stopped the cascade, if one did. Sheets below
   * it were left open.
   */
  stoppedAt?: string;
}

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
  open(sheet: OpenPayload, mode?: OpenMode): OpenResult;
  markOpen(id: string): void;
  startClosing(id: string): void;
  finishClosing(id: string): void;
  updateParams(id: string, params: Record<string, unknown> | undefined): void;
  setPreventDismiss(id: string, prevent: boolean): void;
  setBackdrop(id: string, backdrop: boolean): void;
  clearGroup(groupId: string): void;
  clearAll(): void;
  mount(sheet: MountPayload): void;
  unmount(id: string): void;
}

export type BottomSheetStore = BottomSheetStoreState & BottomSheetStoreActions;
