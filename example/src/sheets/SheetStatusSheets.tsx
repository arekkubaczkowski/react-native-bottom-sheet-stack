import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useBottomSheetContext,
  useBottomSheetControl,
  useBottomSheetStatus,
} from 'react-native-bottom-sheet-stack';

import {
  Badge,
  Button,
  SecondaryButton,
  Sheet,
  SmallButton,
} from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * The status flags read from outside a sheet, next to the rejection that
 * misreading them causes.
 *
 * `isOpen` is `'open'` only, so a guard written as `if (!isOpen) open()` fires a
 * second open while the sheet is still animating in, and the store declines it
 * as `already-active`. Both guards are wired to their own button — press them
 * during the open animation to see the two answers diverge.
 */

type StatusSheetId = 'status-demo' | 'status-demo-b';

export const StatusDemoSheet = forwardRef<
  BottomSheetMethods,
  { id: StatusSheetId }
>(({ id }, ref) => {
  const { close } = useBottomSheetContext();
  const self = useBottomSheetControl(id);
  const [reopen, setReopen] = useState('not tried');

  // From inside, because the backdrop swallows every tap outside the sheet —
  // the home-screen panel is unreachable while this is up.
  const reopenSelf = () => setReopen(`open() → ${self.open()}`);

  return (
    <Sheet ref={ref}>
      <Badge label={id} color={colors.pink} />
      <Text style={sharedStyles.h1}>Status demo</Text>
      <Text style={sharedStyles.text}>
        The panel on the home screen is watching this sheet. Drag it down
        slowly, or close it, and the flags run opening → open → closing → gone.
      </Text>

      <View style={sharedStyles.contextBox}>
        <Text style={sharedStyles.contextTitle}>RE-OPEN WHILE OPEN</Text>
        <Text style={sharedStyles.contextValue}>{reopen}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <Button
          title="open() myself again — already-active"
          onPress={reopenSelf}
        />
        <SecondaryButton title="Close" onPress={close} />
      </View>
    </Sheet>
  );
});

StatusDemoSheet.displayName = 'StatusDemoSheet';

function Flag({ label, value }: { label: string; value: boolean | string }) {
  const isOn = value === true;
  const text = typeof value === 'boolean' ? String(value) : value;

  return (
    <View style={styles.flag}>
      <Text style={styles.flagLabel}>{label}</Text>
      <Text
        style={[
          styles.flagValue,
          { color: isOn ? colors.success : colors.textMuted },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function StatusDemoPanel() {
  const sheet = useBottomSheetControl('status-demo');
  const other = useBottomSheetControl('status-demo-b');
  const { status, isOpen, isOpening, isClosing, isVisible } =
    useBottomSheetStatus('status-demo');

  const [lastCall, setLastCall] = useState('no call yet');

  const report = (label: string, accepted: boolean) =>
    setLastCall(
      `${label}\n→ ${accepted ? 'opened' : 'declined (see warning)'}`
    );

  // Two opens in one tick: the first leaves the group in 'opening', so the
  // second — a different sheet, so not `already-active` — is refused as
  // `group-busy`.
  const openTwoAtOnce = () => {
    const first = sheet.open();
    const second = other.open();
    setLastCall(`status-demo → ${first}\nstatus-demo-b → ${second}`);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.flags}>
        <Flag label="status" value={status ?? 'null'} />
        <Flag label="isOpen" value={isOpen} />
        <Flag label="isOpening" value={isOpening} />
        <Flag label="isClosing" value={isClosing} />
        <Flag label="isVisible" value={isVisible} />
      </View>

      <View style={sharedStyles.contextBox}>
        <Text style={sharedStyles.contextTitle}>LAST OPEN CALL</Text>
        <Text style={sharedStyles.contextValue}>{lastCall}</Text>
      </View>

      <View style={styles.buttons}>
        <SmallButton
          title="open()"
          onPress={() =>
            report('open()', sheet.open({ scaleBackground: true }))
          }
        />
        <SmallButton
          title="open() again"
          color={colors.warningDark}
          onPress={() => report('open() again', sheet.open())}
        />
        <SmallButton
          title="two at once"
          color={colors.warningDark}
          onPress={openTwoAtOnce}
        />
        <SmallButton
          title="guard on isOpen"
          color={colors.errorDark}
          onPress={() =>
            report(
              'if (!isOpen) open()',
              isOpen ? false : sheet.open({ scaleBackground: true })
            )
          }
        />
        <SmallButton
          title="guard on isVisible"
          color={colors.successDark}
          onPress={() =>
            report(
              'if (!isVisible) open()',
              isVisible ? false : sheet.open({ scaleBackground: true })
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  flag: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagLabel: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flagValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
