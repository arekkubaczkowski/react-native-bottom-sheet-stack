import type { RefObject } from 'react';

/**
 * Minimal ref interface for controlling a sheet/modal/overlay.
 * Every adapter must implement these two methods.
 *
 * The coordinator calls:
 * - `expand()` when status transitions to 'opening'
 * - `close()` when status transitions to 'closing' or 'hidden'
 */
export interface SheetAdapterRef {
  expand(): void;
  close(): void;
}

/**
 * Event handlers that adapters MUST call to sync UI state back to the store.
 * Returned by `createSheetEventHandlers(sheetId)`.
 *
 * Lifecycle:
 * 1. Coordinator calls `ref.expand()` → adapter shows UI
 * 2. Adapter calls `handleOpened()` when show animation completes
 * 3. User dismisses (swipe/backdrop/back) → adapter calls `handleDismiss()`
 * 4. Adapter calls `handleClosed()` when hide animation completes
 */
export interface SheetAdapterEvents {
  /** User-initiated dismiss (swipe down, backdrop tap, hardware back button) */
  handleDismiss(): void;
  /** Show animation completed — sheet is fully visible and interactive */
  handleOpened(): void;
  /** Hide animation completed — sheet is fully hidden */
  handleClosed(): void;
}

export type SheetRef = RefObject<SheetAdapterRef | null>;
