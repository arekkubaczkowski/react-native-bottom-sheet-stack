import type { ReactNode } from 'react';

import { BottomSheetContext } from '../BottomSheet.context';
import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import { useBottomSheetStore } from '../store';
import type { OpenMode, OpenPayload } from '../store';
import { resetBottomSheetRegistries } from '../testing';

export const store = () => useBottomSheetStore.getState();

export const portal = (id: string, groupId = 'g1'): OpenPayload => ({
  kind: 'portal',
  id,
  groupId,
});

/** Opens a sheet and settles it, so the group is not left mid-animation. */
export function openAndSettle(id: string, groupId = 'g1', mode?: OpenMode) {
  store().open(portal(id, groupId), mode);
  store().markOpen(id);
}

export const statusOf = (id: string) => store().sheetsById[id]?.status;

export const stackOf = (groupId: string) =>
  store().stackOrderByGroup[groupId] ?? [];

/**
 * Everything observable about one group: its stack plus every sheet's status.
 *
 * Isolation assertions compare this across an operation in a *different*
 * group. Checking a single sheet is too weak — it only catches a leak that
 * happens to land on the sheet the test picked.
 */
export function snapshotGroup(groupId: string) {
  const { sheetsById, stackOrderByGroup } = store();
  return {
    stack: stackOrderByGroup[groupId] ?? [],
    statuses: Object.fromEntries(
      Object.values(sheetsById)
        .filter((sheet) => sheet.groupId === groupId)
        .map((sheet) => [sheet.id, sheet.status])
    ),
  };
}

export const makeRef = () => ({
  current: { expand: jest.fn(), close: jest.fn() },
});

export const inGroup =
  (id = 'g1') =>
  ({ children }: { children: ReactNode }) => (
    <BottomSheetManagerProvider id={id}>{children}</BottomSheetManagerProvider>
  );

export const inSheet =
  (id: string, groupId = 'g1') =>
  ({ children }: { children: ReactNode }) => (
    <BottomSheetManagerProvider id={groupId}>
      <BottomSheetContext.Provider value={{ id }}>
        {children}
      </BottomSheetContext.Provider>
    </BottomSheetManagerProvider>
  );

/**
 * Per-test reset, plus silencing the dev warnings `open()` emits on rejection —
 * several suites exercise rejection deliberately. Tests that assert on a
 * warning can still read the spy through `console.warn`.
 */
export function setupSheetTest() {
  beforeEach(() => {
    resetBottomSheetRegistries();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
}
