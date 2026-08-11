import type { BackdropConfig } from './backdrop.types';

/**
 * Back-compat shim for the `backdrop?: boolean` option on `open()`.
 *
 * Isolated in its own module so the deprecation is one import and one call to
 * delete in the next major, rather than something to untangle from the open
 * paths.
 *
 * It writes through `setBackdrop` after the store has accepted the open, so
 * `open()` itself still never touches the field — that is what lets a
 * persistent sheet keep an adapter-set config across re-open cycles. An
 * adapter that declares its own `backdrop` prop overwrites this on the next
 * commit, which is the precedence we want: the explicit, more specific
 * declaration wins.
 */
export function applyDeprecatedBackdrop(
  id: string,
  backdrop: boolean | undefined,
  setBackdrop: (id: string, value: boolean | BackdropConfig) => void
): void {
  if (backdrop === undefined) return;

  if (__DEV__) {
    console.warn(
      '[BottomSheet] The `backdrop` option on open() is deprecated and will be ' +
        "removed in the next major. Pass it to the sheet's adapter instead — " +
        '`<MyAdapter backdrop={false}>`, or a BackdropConfig to restyle or ' +
        'replace it. See https://arekkubaczkowski.github.io/react-native-bottom-sheet-stack/backdrop'
    );
  }

  // `true` meant "the default backdrop" in v2, which is what clearing the
  // override resolves to now.
  setBackdrop(id, backdrop);
}
