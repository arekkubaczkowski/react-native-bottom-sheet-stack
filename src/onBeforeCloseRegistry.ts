/**
 * Registry for onBeforeClose interceptors.
 *
 * Callbacks are keyed by sheet ID. When a sheet is about to close,
 * the coordinator checks this registry and calls the interceptor.
 * If the interceptor returns `false` (or resolves to `false`),
 * the close is cancelled.
 */
export type OnBeforeCloseCallback = () => boolean | Promise<boolean>;

const onBeforeCloseMap = new Map<string, OnBeforeCloseCallback>();

export function getOnBeforeClose(
  sheetId: string
): OnBeforeCloseCallback | undefined {
  return onBeforeCloseMap.get(sheetId);
}

export function setOnBeforeClose(
  sheetId: string,
  callback: OnBeforeCloseCallback
): void {
  onBeforeCloseMap.set(sheetId, callback);
}

export function removeOnBeforeClose(sheetId: string): void {
  onBeforeCloseMap.delete(sheetId);
}

/**
 * Reset all interceptors. Useful for testing.
 * @internal
 */
export function __resetOnBeforeClose(): void {
  onBeforeCloseMap.clear();
}
