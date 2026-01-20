import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { BottomSheetManaged } from 'react-native-bottom-sheet-stack';
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

    const handleStyle = {
      backgroundColor,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    };

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
          handleStyle={handleStyle}
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
        handleStyle={handleStyle}
      >
        <Content style={scrollable ? undefined : contentStyle}>
          {scrollable ? <View style={contentStyle}>{children}</View> : children}
        </Content>
      </BottomSheetManaged>
    );
  }
);

Sheet.displayName = 'Sheet';
