import { Component, type ReactElement } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render } from '@testing-library/react-native';

import { BottomSheetHost, type SheetWrapperProps } from '../BottomSheetHost';
import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import { getSheetRef, setSheetRef } from '../refsMap';
import { useBottomSheetContext } from '../useBottomSheetContext';
import { makeRef, portal, setupSheetTest, store } from './testUtils';

// QueueItem measures the frame, which the real provider reads from native.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

setupSheetTest();

/** What `useBottomSheetManager().open()` does: store first, ref registered after. */
const openInline = (id: string, content: ReactElement, groupId = 'g1') => {
  store().open({ kind: 'inline', id, groupId, content });
  setSheetRef(id, makeRef());
};

const renderHost = (SheetWrapper?: React.ComponentType<SheetWrapperProps>) =>
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <BottomSheetManagerProvider id="g1">
        <BottomSheetHost SheetWrapper={SheetWrapper} />
      </BottomSheetManagerProvider>
    </SafeAreaProvider>
  );

describe('BottomSheetHost SheetWrapper', () => {
  it('renders inline content unchanged when no wrapper is given', () => {
    const screen = renderHost();
    act(() => openInline('a', <Text>body</Text>));
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('wraps each inline sheet with the wrapper, inside the sheet context', () => {
    const seen: Array<{ id: string; sheetRef: unknown; contextId: string }> =
      [];
    const Wrapper = ({ id, sheetRef, children }: SheetWrapperProps) => {
      const context = useBottomSheetContext();
      seen.push({ id, sheetRef, contextId: context.id });
      return <>{children}</>;
    };
    const screen = renderHost(Wrapper);

    act(() => openInline('a', <Text>body</Text>));

    expect(screen.getByText('body')).toBeTruthy();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      id: 'a',
      sheetRef: getSheetRef('a'),
      contextId: 'a',
    });
  });

  // Portal content renders at its declaration site; the host only mounts a
  // PortalHost, so there is nothing for a wrapper to catch there.
  it('does not wrap portal sheets', () => {
    const Wrapper = jest.fn(({ children }: SheetWrapperProps) => (
      <>{children}</>
    ));
    renderHost(Wrapper);

    act(() => store().open(portal('p')));

    expect(Wrapper).not.toHaveBeenCalled();
  });

  it('lets a boundary replace one sheet while the others stay mounted', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    class Boundary extends Component<SheetWrapperProps, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? <Text>fallback</Text> : this.props.children;
      }
    }
    const Throws = () => {
      throw new Error('boom');
    };
    const screen = renderHost(Boundary);

    act(() => {
      openInline('a', <Text>first</Text>);
      store().markOpen('a');
      openInline('b', <Throws />);
    });

    expect(screen.getByText('first')).toBeTruthy();
    expect(screen.getByText('fallback')).toBeTruthy();
    expect(store().stackOrderByGroup.g1).toEqual(['a', 'b']);
  });
});
