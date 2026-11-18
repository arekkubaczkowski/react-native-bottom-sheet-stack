import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as reanimated from 'react-native-reanimated';

import { CustomModalAdapter } from '../adapters/custom-modal';
import type { SheetAdapterRef } from '../adapter.types';
import { inSheet, portal, setupSheetTest, statusOf, store } from './testUtils';

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) =>
    fn(...args),
}));

setupSheetTest();

function renderOpening() {
  store().open(portal('modal'));
  const ref = { current: null as SheetAdapterRef | null };
  const view = render(
    <CustomModalAdapter ref={ref}>
      <Text>Modal body</Text>
    </CustomModalAdapter>,
    { wrapper: inSheet('modal') }
  );
  return { ...view, ref };
}

beforeEach(() => {
  jest.spyOn(reanimated, 'withTiming');
});

afterEach(() => {
  jest.restoreAllMocks();
});

function finishAnimation() {
  const callback = jest.mocked(reanimated.withTiming).mock.lastCall?.[2];
  expect(callback).toBeDefined();
  act(() => callback?.(true));
}

it('animates opening and closing when the manager drives the modal', () => {
  const { ref, getByText, queryByText } = renderOpening();

  act(() => ref.current?.expand());
  expect(reanimated.withTiming).toHaveBeenLastCalledWith(
    1,
    expect.objectContaining({ duration: 300 }),
    expect.any(Function)
  );
  expect(getByText('Modal body')).toBeTruthy();
  finishAnimation();
  expect(statusOf('modal')).toBe('open');

  act(() => {
    store().startClosing('modal');
    ref.current?.close();
  });
  finishAnimation();
  expect(queryByText('Modal body')).toBeNull();
  expect(statusOf('modal')).toBeUndefined();
});

it('ignores a close completion that arrives after the modal has been restored', () => {
  const { ref, getByText } = renderOpening();
  act(() => ref.current?.expand());
  finishAnimation();

  act(() => {
    store().open(portal('other'), 'switch');
    store().markOpen('other');
    ref.current?.close();
  });
  const oldClose = jest.mocked(reanimated.withTiming).mock.lastCall?.[2];
  expect(oldClose).toBeDefined();

  act(() => {
    store().startClosing('other');
    ref.current?.expand();
    oldClose?.(true);
  });
  finishAnimation();
  expect(getByText('Modal body')).toBeTruthy();
  expect(statusOf('modal')).toBe('open');
});
