import {
  BottomSheetHandle,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useCallback, useMemo, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { BottomSheetManaged } from '../../../src/adapters/gorhom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sharedStyles } from '../styles/theme';

interface SheetProps {
  children: ReactNode;
  backgroundColor?: string;
  snapPoints?: string[];
  enableDynamicSizing?: boolean;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Sheet = forwardRef<BottomSheetMethods, SheetProps>(
  (
    {
      children,
      backgroundColor = colors.surface,
      snapPoints,
      enableDynamicSizing = true,
      scrollable = false,
      style,
    },
    ref
  ) => {
    const { top } = useSafeAreaInsets();

    const handleStyle = useMemo(
      () => ({
        backgroundColor,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 12,
        paddingBottom: 8,
      }),
      [backgroundColor]
    );

    const backgroundStyle = useMemo(
      () => ({
        backgroundColor,
      }),
      [backgroundColor]
    );

    const handleIndicatorStyle = useMemo(
      () => ({
        backgroundColor: colors.border,
        width: 40,
        height: 4,
      }),
      []
    );

    const renderHandle = useCallback(
      (props: any) => (
        <BottomSheetHandle
          {...props}
          style={handleStyle}
          indicatorStyle={handleIndicatorStyle}
        />
      ),
      [handleStyle, handleIndicatorStyle]
    );

    const contentStyle = [
      sharedStyles.sheetContent,
      { backgroundColor },
      style,
    ];

    const Content = scrollable ? BottomSheetScrollView : BottomSheetView;

    if (snapPoints) {
      return (
        <BottomSheetManaged
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          topInset={top}
          ref={ref}
          handleComponent={renderHandle}
          backgroundStyle={backgroundStyle}
        >
          <Content style={scrollable ? undefined : [{ flex: 1 }, contentStyle]}>
            {scrollable ? (
              <View style={contentStyle}>{children}</View>
            ) : (
              children
            )}
          </Content>
        </BottomSheetManaged>
      );
    }

    return (
      <BottomSheetManaged
        enableDynamicSizing={enableDynamicSizing}
        ref={ref}
        handleComponent={renderHandle}
        backgroundStyle={backgroundStyle}
      >
        <Content style={scrollable ? undefined : contentStyle}>
          {scrollable ? <View style={contentStyle}>{children}</View> : children}
        </Content>
      </BottomSheetManaged>
    );
  }
);

Sheet.displayName = 'Sheet';
