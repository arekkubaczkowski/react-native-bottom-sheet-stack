/**
 * Registry for portal-based bottom sheets.
 * Augment this interface in your app to get type-safe sheet IDs and params:
 *
 * @example
 * ```tsx
 * declare module 'react-native-bottom-sheet-stack' {
 *   interface BottomSheetPortalRegistry {
 *     'simple-sheet': true;  // no params
 *     'user-sheet': { userId: string };  // with params
 *     'settings-sheet': { theme: 'light' | 'dark'; notifications: boolean };
 *   }
 * }
 * ```
 */
export interface BottomSheetPortalRegistry {}

/**
 * Type-safe portal sheet ID.
 * If BottomSheetPortalRegistry is augmented, this will be a union of the registered keys.
 * Otherwise, it falls back to `string` for flexibility.
 */
export type BottomSheetPortalId = keyof BottomSheetPortalRegistry extends never
  ? string
  : Extract<keyof BottomSheetPortalRegistry, string>;

/**
 * Extract params type for a given portal sheet ID.
 * Returns `undefined` if the sheet has no params (value is `true`).
 */
export type BottomSheetPortalParams<T extends BottomSheetPortalId> =
  keyof BottomSheetPortalRegistry extends never
    ? Record<string, unknown> | undefined
    : T extends keyof BottomSheetPortalRegistry
      ? BottomSheetPortalRegistry[T] extends true
        ? undefined
        : BottomSheetPortalRegistry[T]
      : Record<string, unknown> | undefined;

/**
 * Check if a portal sheet has params defined.
 */
export type HasParams<T extends BottomSheetPortalId> =
  keyof BottomSheetPortalRegistry extends never
    ? false
    : T extends keyof BottomSheetPortalRegistry
      ? BottomSheetPortalRegistry[T] extends true
        ? false
        : true
      : false;
