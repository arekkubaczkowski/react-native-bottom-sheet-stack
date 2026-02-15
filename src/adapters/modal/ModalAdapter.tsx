import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Modal, type ModalProps, StyleSheet, View } from 'react-native';

import type { SheetAdapterRef } from '../../adapter.types';
import { setAnimatedIndexValue } from '../../animatedRegistry';
import { createSheetEventHandlers } from '../../bottomSheetCoordinator';
import { useBottomSheetRefContext } from '../../BottomSheetRef.context';
import { useBottomSheetContext } from '../../useBottomSheetContext';

export interface ModalAdapterProps {
  children: React.ReactNode;
  /** Animation type for the modal transition (default: 'slide') */
  animationType?: ModalProps['animationType'];
  /** Presentation style on iOS (default: 'pageSheet') */
  presentationStyle?: ModalProps['presentationStyle'];
  /** Whether the modal is transparent (default: false) */
  transparent?: boolean;
  /** Status bar translucent on Android */
  statusBarTranslucent?: boolean;
  /** Style for the inner content container */
  contentContainerStyle?: View['props']['style'];
}

export const ModalAdapter = React.forwardRef<
  SheetAdapterRef,
  ModalAdapterProps
>(
  (
    {
      children,
      animationType = 'slide',
      presentationStyle = 'pageSheet',
      transparent = false,
      statusBarTranslucent,
      contentContainerStyle,
    },
    forwardedRef
  ) => {
    const { id } = useBottomSheetContext();
    const contextRef = useBottomSheetRefContext();
    const [visible, setVisible] = useState(false);

    const { handleDismiss, handleOpened, handleClosed } =
      createSheetEventHandlers(id);

    const ref = contextRef ?? forwardedRef;

    useImperativeHandle(
      ref,
      () => ({
        expand: () => {
          setVisible(true);
        },
        close: () => {
          setVisible(false);
        },
      }),
      []
    );

    // Sync animated index for backdrop/scale integration
    useEffect(() => {
      setAnimatedIndexValue(id, visible ? 0 : -1);
    }, [visible, id]);

    const onShow = () => {
      handleOpened();
    };

    const onRequestClose = () => {
      handleDismiss();
    };

    const onDismiss = () => {
      handleClosed();
    };

    return (
      <Modal
        visible={visible}
        animationType={animationType}
        presentationStyle={presentationStyle}
        transparent={transparent}
        statusBarTranslucent={statusBarTranslucent}
        onShow={onShow}
        onRequestClose={onRequestClose}
        onDismiss={onDismiss}
      >
        <View style={[styles.container, contentContainerStyle]}>
          {children}
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
