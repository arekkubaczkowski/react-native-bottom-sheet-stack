import { useLayoutEffect, useRef } from 'react';

import type { BackdropConfig } from './backdrop.types';
import { useSetBackdrop } from './store';

/**
 * Applies an adapter's `backdrop` prop to the sheet's store record, where the
 * manager's shared backdrop reads it.
 *
 * Split into a value-sync effect and an unmount cleanup on purpose: a single
 * effect keyed on `backdrop` would clear-and-rewrite on every fresh object
 * literal a consumer passes in JSX, waking store subscribers twice per
 * render. The sync effect instead writes through `setBackdrop`, which bails
 * on value equality, and the cleanup runs only when the adapter is really
 * going away.
 *
 * Layout effects rather than passive ones because the write lands a commit
 * after the backdrop first renders: until it does, the sheet inherits the
 * group default. For a `styled` group default that is invisible — the fade
 * holds it at zero opacity on that frame — but a `custom` one owns its fade
 * and would otherwise paint at full strength for a frame before the sheet's
 * own config replaces it.
 *
 * Public for third-party adapters — pair it with a
 * `backdrop?: BackdropConfig | false` prop to reach parity with the shipped
 * ones.
 */
export function useAdapterBackdrop(
  id: string,
  backdrop: BackdropConfig | false | undefined
): void {
  const setBackdrop = useSetBackdrop();
  /**
   * Whether this adapter has an opinion to withdraw.
   *
   * An adapter that has never been given a `backdrop` prop must not write at
   * all — clearing unconditionally would wipe a value set from somewhere else,
   * which is exactly what the deprecated `open({ backdrop })` option does.
   * Once the prop *has* been set, dropping it back to `undefined` still clears,
   * so a conditional prop falls back to the group default rather than freezing.
   */
  const hasWritten = useRef(false);

  useLayoutEffect(() => {
    if (backdrop === undefined && !hasWritten.current) return;
    hasWritten.current = backdrop !== undefined;
    setBackdrop(id, backdrop ?? true);
  }, [id, backdrop, setBackdrop]);

  useLayoutEffect(() => {
    return () => {
      if (hasWritten.current) setBackdrop(id, true);
    };
  }, [id, setBackdrop]);
}
