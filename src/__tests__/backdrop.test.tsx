import {
  act,
  fireEvent,
  render,
  renderHook,
} from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';

import type { BackdropComponentProps, BackdropConfig } from '../backdrop.types';
import { getAnimatedIndex } from '../animatedRegistry';
import { BottomSheetBackdrop } from '../BottomSheetBackdrop';
import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import { setOnBeforeClose } from '../onBeforeCloseRegistry';
import { useBottomSheetStore } from '../store';
import { isBackdropEnabled } from '../backdrop.resolve';
import { useSheetBackdropOverride } from '../store';
import { useAdapterBackdrop } from '../useAdapterBackdrop';
import { portal, setupSheetTest, statusOf, store } from './testUtils';

setupSheetTest();

const setBackdrop = (id: string, value: boolean | BackdropConfig) =>
  store().setBackdrop(id, value);

const backdropOf = (id: string) => store().sheetsById[id]?.backdrop;

const styled = (
  backgroundColor: string,
  rest?: Partial<Extract<BackdropConfig, { kind: 'styled' }>>
): BackdropConfig => ({ kind: 'styled', style: { backgroundColor }, ...rest });

describe('setBackdrop', () => {
  beforeEach(() => {
    store().open(portal('a'));
  });

  it('stores a config, false, and clears on true', () => {
    const config = styled('red');

    setBackdrop('a', config);
    expect(backdropOf('a')).toBe(config);

    setBackdrop('a', false);
    expect(backdropOf('a')).toBe(false);

    setBackdrop('a', true);
    expect(backdropOf('a')).toBeUndefined();
  });

  // The boolean suppress/restore cycle an adapter drives (`false` while it
  // draws its own backdrop, `true` to hand it back) must round-trip to "no
  // override", not to a stored `true`.
  it('round-trips the boolean suppress/restore cycle', () => {
    setBackdrop('a', false);
    setBackdrop('a', true);
    expect(backdropOf('a')).toBeUndefined();
  });

  // Adapters re-apply their `backdrop` prop with a fresh object literal on
  // every consumer render; without value equality each render would wake every
  // store subscriber.
  it('does not notify subscribers for a value-equal config', () => {
    const listener = jest.fn();
    const unsubscribe = useBottomSheetStore.subscribe(listener);

    setBackdrop('a', { kind: 'styled', style: { backgroundColor: 'red' } });
    setBackdrop('a', { kind: 'styled', style: { backgroundColor: 'red' } });
    setBackdrop('a', true);
    setBackdrop('a', true);

    // One write for the config, one for the clear — the value-equal repeats
    // must not produce a state change.
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('notifies subscribers when the config actually changes', () => {
    const listener = jest.fn();
    const unsubscribe = useBottomSheetStore.subscribe(listener);

    setBackdrop('a', styled('red'));
    setBackdrop('a', styled('blue'));
    setBackdrop('a', { ...styled('blue'), pressToDismiss: false });

    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('distinguishes custom configs by component identity', () => {
    const listener = jest.fn();
    const A = () => null;
    const B = () => null;

    const unsubscribe = useBottomSheetStore.subscribe(listener);
    setBackdrop('a', { kind: 'custom', component: A });
    setBackdrop('a', { kind: 'custom', component: A });
    setBackdrop('a', { kind: 'custom', component: B });

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  // Walking only one style's keys returned `true` here — the count matched
  // because the explicit `undefined` counted as a key — and the restyle was
  // silently dropped.
  it('sees a change when one style carries an explicit undefined', () => {
    setBackdrop('a', {
      kind: 'styled',
      style: { backgroundColor: 'red', opacity: undefined },
    });
    setBackdrop('a', {
      kind: 'styled',
      style: { backgroundColor: 'red', borderRadius: 20 },
    });

    expect(backdropOf('a')).toMatchObject({
      style: { backgroundColor: 'red', borderRadius: 20 },
    });
  });

  it('treats an explicit undefined as the absence of the key', () => {
    const listener = jest.fn();
    setBackdrop('a', { kind: 'styled', style: { backgroundColor: 'red' } });

    const unsubscribe = useBottomSheetStore.subscribe(listener);
    setBackdrop('a', {
      kind: 'styled',
      style: { backgroundColor: 'red', opacity: undefined },
    });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('ignores writes for unknown sheets', () => {
    const listener = jest.fn();
    const unsubscribe = useBottomSheetStore.subscribe(listener);

    setBackdrop('missing', false);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('backdrop across the sheet lifecycle', () => {
  // `open()` no longer carries a backdrop field, so a persistent sheet's
  // adapter-set config must survive a full close/re-open cycle untouched.
  it('survives a persistent sheet re-open', () => {
    store().mount({ id: 'p', groupId: 'g1' });
    const config = styled('red');
    setBackdrop('p', config);

    store().open(portal('p'));
    store().markOpen('p');
    store().startClosing('p');
    store().finishClosing('p');
    expect(statusOf('p')).toBe('hidden');

    store().open(portal('p'));
    expect(backdropOf('p')).toBe(config);
  });
});

describe('useAdapterBackdrop', () => {
  beforeEach(() => {
    store().open(portal('a'));
  });

  it('applies the prop value and clears it on unmount', () => {
    const config = styled('red');
    const { unmount, rerender } = renderHook(
      ({ value }: { value: BackdropConfig | false | undefined }) =>
        useAdapterBackdrop('a', value),
      { initialProps: { value: config as BackdropConfig | false | undefined } }
    );

    expect(backdropOf('a')).toBe(config);

    rerender({ value: false });
    expect(backdropOf('a')).toBe(false);

    unmount();
    expect(backdropOf('a')).toBeUndefined();
  });

  // The hook's whole reason to exist. A single effect with a cleanup would
  // clear-and-rewrite here, because a consumer's JSX rebuilds the literal on
  // every render.
  it('does not touch the store when the prop is re-created value-equal', () => {
    const value = (): BackdropConfig => styled('red');
    const { rerender } = renderHook(
      ({ v }: { v: BackdropConfig }) => useAdapterBackdrop('a', v),
      { initialProps: { v: value() } }
    );

    const listener = jest.fn();
    const unsubscribe = useBottomSheetStore.subscribe(listener);
    rerender({ v: value() });
    rerender({ v: value() });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  // Removing the prop must fall the sheet back to the group default, not
  // freeze the last value.
  it('clears the override when the prop becomes undefined', () => {
    const { rerender } = renderHook(
      ({ value }: { value: BackdropConfig | false | undefined }) =>
        useAdapterBackdrop('a', value),
      { initialProps: { value: false as BackdropConfig | false | undefined } }
    );
    expect(backdropOf('a')).toBe(false);

    rerender({ value: undefined });
    expect(backdropOf('a')).toBeUndefined();
  });
});

describe('backdrop enablement', () => {
  beforeEach(() => {
    store().open(portal('a'));
  });

  // `QueueItem` is memoized because every host render rebuilds its children;
  // subscribing it to the config would re-render the whole sheet layer on
  // every restyle.
  it('re-renders on on/off but not on restyle', () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useSheetBackdropOverride('a');
    });
    const afterMount = renders;

    act(() => setBackdrop('a', styled('red')));
    act(() => setBackdrop('a', styled('blue')));
    const afterRestyle = renders;

    act(() => setBackdrop('a', false));

    expect(afterRestyle).toBe(afterMount + 1); // 'inherit' → 'own', then flat
    expect(renders).toBe(afterRestyle + 1); // 'own' → 'off'
  });

  it('answers inherit from the group, and lets the sheet override it', () => {
    expect(isBackdropEnabled('inherit', undefined)).toBe(true);
    expect(isBackdropEnabled('inherit', false)).toBe(false);
    expect(isBackdropEnabled('own', false)).toBe(true);
    expect(isBackdropEnabled('off', undefined)).toBe(false);
  });
});

describe('BottomSheetBackdrop rendering', () => {
  const renderBackdrop = (groupConfig?: BackdropConfig | false) =>
    render(<BottomSheetBackdrop sheetId="a" />, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <BottomSheetManagerProvider id="g1" backdrop={groupConfig}>
          {children}
        </BottomSheetManagerProvider>
      ),
    });

  const press = async (result: ReturnType<typeof renderBackdrop>) => {
    await act(async () => {
      fireEvent.press(result.getByTestId('bottom-sheet-backdrop-a'));
    });
  };

  beforeEach(() => {
    store().open(portal('a'));
    store().markOpen('a');
  });

  /** The resolved style of the scrim itself — the Pressable's only child. */
  const scrimStyle = (result: ReturnType<typeof renderBackdrop>) => {
    const scrim = result.getByTestId('bottom-sheet-backdrop-a').children[0];
    if (typeof scrim === 'string') throw new Error('expected the scrim view');
    return StyleSheet.flatten(
      scrim.props.style as Parameters<typeof StyleSheet.flatten>[0]
    );
  };

  it('keeps the default scrim with no config anywhere', () => {
    expect(scrimStyle(renderBackdrop())).toMatchObject({
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    });
  });

  it('layers group style over the default', () => {
    expect(scrimStyle(renderBackdrop(styled('red')))).toMatchObject({
      backgroundColor: 'red',
    });
  });

  it('composes sheet style over group style when both are styled', () => {
    act(() => setBackdrop('a', styled('blue')));
    expect(scrimStyle(renderBackdrop(styled('red')))).toMatchObject({
      backgroundColor: 'blue',
    });
  });

  // The manager drives the fade off `animatedIndex`; a config style carrying
  // its own `opacity` must restyle the scrim without replacing that fade.
  it('keeps the animated opacity over a static one in the config', () => {
    jest.mocked(useAnimatedStyle).mockReturnValueOnce({ opacity: 0.99 });
    act(() =>
      setBackdrop('a', {
        kind: 'styled',
        style: { backgroundColor: 'black', opacity: 0.3 },
      })
    );

    expect(scrimStyle(renderBackdrop())).toMatchObject({
      backgroundColor: 'black',
      opacity: 0.99,
    });
  });

  it('renders a custom component with the sheet id and live animated index', () => {
    const received: BackdropComponentProps[] = [];
    const Custom = (props: BackdropComponentProps) => {
      received.push(props);
      return null;
    };

    act(() => setBackdrop('a', { kind: 'custom', component: Custom }));
    renderBackdrop(styled('red'));

    expect(received[0]?.sheetId).toBe('a');
    expect(received[0]?.animatedIndex).toBe(getAnimatedIndex('a'));
    expect(typeof received[0]?.close).toBe('function');
  });

  // The visual choice is atomic: a sheet-level styled config must fully
  // replace a group-level custom component, not layer under it.
  it('does not render the group custom component when the sheet asks for styled', () => {
    const Custom = jest.fn(() => null);

    act(() => setBackdrop('a', styled('blue')));
    renderBackdrop({ kind: 'custom', component: Custom });

    expect(Custom).not.toHaveBeenCalled();
  });

  it('closes on press through the interceptor path', async () => {
    const result = renderBackdrop();

    await press(result);

    expect(statusOf('a')).toBe('closing');
  });

  it('does not close when an interceptor refuses', async () => {
    setOnBeforeClose('a', ({ onCancel }) => onCancel());
    const result = renderBackdrop();

    await press(result);

    expect(statusOf('a')).toBe('open');
  });

  it('ignores presses when pressToDismiss is false', async () => {
    act(() => setBackdrop('a', { ...styled('blue'), pressToDismiss: false }));
    const result = renderBackdrop();

    await press(result);

    expect(statusOf('a')).toBe('open');
  });

  // `pressToDismiss` resolves per field: a sheet that only restyles must still
  // inherit the group's decision to disable tap-to-dismiss.
  it('falls back to the group pressToDismiss when the sheet does not set it', async () => {
    act(() => setBackdrop('a', styled('blue')));
    const result = renderBackdrop({
      ...styled('red'),
      pressToDismiss: false,
    });

    await press(result);

    expect(statusOf('a')).toBe('open');
  });
});
