import { type ReactNode } from 'react';

import type { BackdropConfig } from '../backdrop.types';

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
  /**
   * Per-sheet backdrop override, written only by `setBackdrop` (the adapters'
   * `backdrop` prop routes through it) — never by `open()`, so it survives
   * re-open cycles of a persistent sheet. `false` disables the backdrop,
   * `undefined` falls back to the group's `backdropConfig`.
   */
  backdrop?: BackdropConfig | false;
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

/**
 * How far a cascading close reaches.
 *
 * With no bound it empties the group. `until` and `depth` each narrow it, and
 * combining them takes whichever closes fewer sheets.
 */
export interface CascadeOptions {
  /** Delay in ms between each close animation. Default: 100. */
  stagger?: number;
  /**
   * Stop the cascade at this sheet rather than emptying the group.
   *
   * Sheets below it stay open. A sheet that is not on this group's stack
   * closes nothing — a bounded call must not fall back to closing everything.
   */
  until?: string;
  /** Whether the `until` sheet closes as well. Default: `false`. */
  inclusive?: boolean;
  /** Close at most this many sheets, counting from the top of the stack. */
  depth?: number;
}

/** Outcome of a cascading close. */
export interface CloseAllResult {
  /**
   * Whether the cascade closed everything it set out to. Bounded by `until` or
   * `depth`, that is the requested range — not the whole group.
   */
  completed: boolean;
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
  /**
   * Sets the sheet's backdrop override: `false` = no backdrop, a
   * {@link BackdropConfig} = custom look, `true` = clear the override and fall
   * back to the group default. Widened from the old boolean signature, so
   * adapters that only ever suppress/restore keep working unchanged.
   */
  setBackdrop(id: string, backdrop: boolean | BackdropConfig): void;
  clearGroup(groupId: string): void;
  clearAll(): void;
  mount(sheet: MountPayload): void;
  unmount(id: string): void;
}

export type BottomSheetStore = BottomSheetStoreState & BottomSheetStoreActions;
