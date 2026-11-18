import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  type SheetAdapterRef,
  useBottomSheetContext,
  useOnBeforeClose,
} from 'react-native-bottom-sheet-stack';
import { SwmansionSheetAdapter } from 'react-native-bottom-sheet-stack/swmansion';

import { Badge, SecondaryButton, SmallButton } from '../components';
import { colors, sharedStyles } from '../styles/theme';

type SheetRef = { ref?: React.Ref<SheetAdapterRef> };

const DETENT_LABELS = ['closed', 'half', 'full'] as const;

export const SwmansionDetentsSheet = ({ ref }: SheetRef) => {
  const { close } = useBottomSheetContext();
  const [expandedIndex, setExpandedIndex] = React.useState(2);

  return (
    <SwmansionSheetAdapter
      ref={ref}
      detents={[0, '40%', '100%']}
      expandedIndex={expandedIndex}
      onIndexChange={(next) => {
        if (next > 0) {
          setExpandedIndex(next);
        }
      }}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.flushRow}>
          <Text style={styles.flushRowText}>
            Opaque first row, flush to the top edge
          </Text>
        </View>
        <View style={styles.body}>
          <Badge label="detents" color={colors.cyan} />
          <Text style={sharedStyles.h1}>Detents</Text>
          <Text style={sharedStyles.text}>
            Index: {expandedIndex} ({DETENT_LABELS[expandedIndex]}). Drag
            between half and full, or move the open sheet with the buttons.
          </Text>
          <View style={styles.row}>
            <SmallButton title="Half" onPress={() => setExpandedIndex(1)} />
            <SmallButton title="Full" onPress={() => setExpandedIndex(2)} />
          </View>
          {Array.from({ length: 30 }, (_, row) => (
            <Text key={row} style={styles.listRow}>
              Row {row + 1}
            </Text>
          ))}
          <SecondaryButton title="Close" onPress={close} />
        </View>
      </ScrollView>
    </SwmansionSheetAdapter>
  );
};

export const SwmansionInterceptedSheet = ({ ref }: SheetRef) => {
  const { close } = useBottomSheetContext();

  useOnBeforeClose(({ onConfirm, onCancel }) => {
    Alert.alert('Discard this sheet?', 'The interceptor asks before closing.', [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: 'Discard', style: 'destructive', onPress: onConfirm },
    ]);
  });

  return (
    <SwmansionSheetAdapter ref={ref} detents={[0, 'content']} handle>
      <View style={styles.body}>
        <Badge label="onBeforeClose" color={colors.warning} />
        <Text style={sharedStyles.h1}>Intercepted</Text>
        <Text style={sharedStyles.text}>
          No grab handle, no drag to close. The backdrop, Android Back and the
          button below all ask first.
        </Text>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </SwmansionSheetAdapter>
  );
};

export const SwmansionDetachedShadowSheet = ({
  ref,
  bottomInset,
}: SheetRef & { bottomInset?: number }) => {
  const { close } = useBottomSheetContext();

  return (
    <SwmansionSheetAdapter
      ref={ref}
      detents={[0, 'content']}
      detached
      bottomInset={bottomInset}
      surfaceStyle={{ boxShadow: '0 8 24 rgba(0, 0, 0, 0.35)' }}
      handle
    >
      <View style={styles.body}>
        <Badge label="detached + shadow" color={colors.warning} />
        <Text style={sharedStyles.h1}>
          {bottomInset === undefined ? 'Detached' : `${bottomInset}pt gap`}
        </Text>
        <Text style={sharedStyles.text}>
          The shadow comes from `surfaceStyle` and shows on all four sides. A
          tap in the gaps around the card reaches the backdrop and closes it.
        </Text>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </SwmansionSheetAdapter>
  );
};

export const SwmansionDetachedDetentsSheet = ({ ref }: SheetRef) => {
  const { close } = useBottomSheetContext();
  const [expandedIndex, setExpandedIndex] = React.useState(1);

  return (
    <SwmansionSheetAdapter
      ref={ref}
      detached
      handle
      detents={[0, 'content', { value: '100%', insets: {} }]}
      fillContent={false}
      expandedIndex={expandedIndex}
      onIndexChange={(next) => {
        if (next > 0) {
          setExpandedIndex(next);
        }
      }}
    >
      <View style={styles.body}>
        <Text style={sharedStyles.h1}>Floating to full height</Text>
        <Text style={sharedStyles.text}>
          Drag up to close the side and bottom gaps. Drag down to restore them.
        </Text>
        <View style={styles.row}>
          <SmallButton title="Floating" onPress={() => setExpandedIndex(1)} />
          <SmallButton
            title="Full height"
            onPress={() => setExpandedIndex(2)}
          />
        </View>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </SwmansionSheetAdapter>
  );
};

export const SwmansionPositionSheet = ({ ref }: SheetRef) => {
  const { close } = useBottomSheetContext();
  const position = useSharedValue(0);

  const followerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(position.get(), [0, 400], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <SwmansionSheetAdapter
      ref={ref}
      detents={[0, 200, 400]}
      animatedPosition={position}
      handle
    >
      <View style={styles.body}>
        <Badge label="animatedPosition" color={colors.cyan} />
        <Text style={sharedStyles.h1}>Position follower</Text>
        <Animated.View style={[styles.follower, followerStyle]} />
        <Text style={sharedStyles.text}>
          The bar is transparent at the bottom and opaque at 400pt. Drag the
          sheet between its two heights and watch it follow.
        </Text>
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </SwmansionSheetAdapter>
  );
};

export const SwmansionCustomHandleSheet = ({ ref }: SheetRef) => {
  const { close } = useBottomSheetContext();

  return (
    <SwmansionSheetAdapter
      ref={ref}
      detents={[0, 'content']}
      handle={
        <View style={styles.customHandle}>
          <View style={styles.customHandlePill} />
          <Pressable
            onPress={close}
            hitSlop={8}
            style={styles.customHandleButton}
          >
            <Text style={styles.customHandleButtonText}>Done</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.body}>
        <Badge label="custom handle" color={colors.purple} />
        <Text style={sharedStyles.h1}>Custom handle</Text>
        <Text style={sharedStyles.text}>
          "Done" lives in the handle, above the content, so it takes the tap.
        </Text>
      </View>
    </SwmansionSheetAdapter>
  );
};

export const SwmansionKeyboardDetachedSheet = ({ ref }: SheetRef) => {
  const { close } = useBottomSheetContext();

  return (
    <SwmansionSheetAdapter
      ref={ref}
      detents={[0, 'content']}
      detached
      keyboardBehavior="inset"
      handle
    >
      <View style={styles.body}>
        <Badge label="detached + keyboard" color={colors.success} />
        <Text style={sharedStyles.h1}>Keyboard, detached</Text>
        <TextInput
          style={styles.input}
          placeholder="Type something…"
          placeholderTextColor={colors.textMuted}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </SwmansionSheetAdapter>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 48,
  },
  flushRow: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  flushRowText: {
    color: colors.text,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  listRow: {
    color: colors.textSecondary,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  follower: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.cyan,
  },
  customHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  customHandlePill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  customHandleButton: {
    position: 'absolute',
    right: 16,
    top: 4,
  },
  customHandleButtonText: {
    color: colors.cyan,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
  },
});
