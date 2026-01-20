/**
 * Registry for portal-based bottom sheets.
 * Augment this interface in your app to get type-safe sheet IDs:
 *
 * @example
 * ```tsx
 * declare module 'react-native-bottom-sheet-stack' {
 *   interface BottomSheetPortalRegistry {
 *     'my-sheet': true;
 *     'settings-sheet': true;
 *     'profile-sheet': true;
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
