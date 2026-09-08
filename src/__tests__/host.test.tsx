import {
  Component,
  createRef,
  useImperativeHandle,
  type ReactElement,
} from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render } from '@testing-library/react-native';

import { BottomSheetHost, type SheetWrapperProps } from '../BottomSheetHost';
import { BottomSheetManagerProvider } from '../BottomSheetManager.provider';
import type { SheetAdapterRef } from '../adapter.types';
import { getSheetRef, setSheetRef } from '../refsMap';
import { useAdapterRef } from '../useAdapterRef';
import { useBottomSheetContext } from '../useBottomSheetContext';
import { makeRef, portal, setupSheetTest, store } from './testUtils';

// QueueItem reads the frame, which the real provider gets from native.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

setupSheetTest();

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

const fallbackExpand = jest.fn();

// Module scope: the compiler outlines the `useImperativeHandle` factory there,
// so a spy declared inside a test would be out of its reach.
const FallbackAdapter = ({
  sheetRef,
}: {
  sheetRef: SheetWrapperProps['sheetRef'];
}) => {
  const ref = useAdapterRef(sheetRef);
  useImperativeHandle(ref, () => ({
    expand: fallbackExpand,
    close: jest.fn(),
  }));
  return <Text>fallback</Text>;
};

class FallbackBoundary extends Component<
  SheetWrapperProps,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <FallbackAdapter sheetRef={this.props.sheetRef} />
    ) : (
      this.props.children
    );
  }
}

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

  it('drives a fallback adapter that replaces a sheet which throws after opening', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fallbackExpand.mockClear();

    const Crashable = () => {
      const { params } = useBottomSheetContext();
      if ((params as { crash?: boolean } | undefined)?.crash) {
        throw new Error('boom');
      }
      return <Text>alive</Text>;
    };

    const screen = renderHost(FallbackBoundary);
    act(() => {
      store().open({
        kind: 'inline',
        id: 'a',
        groupId: 'g1',
        content: <Crashable />,
      });
      setSheetRef('a', createRef<SheetAdapterRef>());
      store().markOpen('a');
    });
    expect(screen.getByText('alive')).toBeTruthy();

    act(() => store().updateParams('a', { crash: true }));

    expect(screen.getByText('fallback')).toBeTruthy();
    expect(getSheetRef('a')?.current?.expand).toBe(fallbackExpand);
    expect(fallbackExpand).toHaveBeenCalledTimes(1);
  });
});
