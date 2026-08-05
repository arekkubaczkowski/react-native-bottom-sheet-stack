/**
 * Test-only helpers.
 *
 * Shipped on a separate subpath so they stay out of the production bundle:
 *
 * ```ts
 * import { resetBottomSheetRegistries } from 'react-native-bottom-sheet-stack/testing';
 *
 * beforeEach(resetBottomSheetRegistries);
 * ```
 */
import {
  __resetAnimatedIndexes,
  __getAllAnimatedIndexes,
} from './animatedRegistry';
import { __resetOnBeforeClose } from './onBeforeCloseRegistry';
import { __resetPortalSessions } from './portalSessionRegistry';
import { __getAllSheetRefs, __resetSheetRefs } from './refsMap';
import { useBottomSheetStore } from './store';

/**
 * Clears every module-level registry **and** the store.
 *
 * The registries outlive React (they are module state), so a test that opens a
 * sheet leaves refs, animated values, portal sessions and interceptors behind
 * for the next one. Call this between tests rather than resetting each registry
 * by hand — it is one call that cannot go out of date as registries are added.
 */
export function resetBottomSheetRegistries(): void {
  useBottomSheetStore.getState().clearAll();
  __resetSheetRefs();
  __resetAnimatedIndexes();
  __resetPortalSessions();
  __resetOnBeforeClose();
}

/**
 * Inspectors for the registries a test is most likely to assert on — chiefly
 * "did this sheet leave a ref (or a shared value) behind after it closed?".
 *
 * Read-only views of the live maps; reset through
 * {@link resetBottomSheetRegistries} rather than mutating them.
 */
export { __getAllSheetRefs, __getAllAnimatedIndexes };
