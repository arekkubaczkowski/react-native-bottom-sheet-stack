import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { forwardRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import {
  useBottomSheetContext,
  useBottomSheetManager,
  useOnBeforeClose,
  type CloseAllResult,
} from 'react-native-bottom-sheet-stack';

import { Badge, Button, SecondaryButton, Sheet } from '../components';
import { colors, sharedStyles } from '../styles/theme';

/**
 * Every bounded-cascade case in one stack.
 *
 * Each level knows its own depth and the ID of the bottom one, so an outcome is
 * readable off the screen: close down to level 1 and everything above it goes
 * while level 1 stays. The result of the last call is printed at the level that
 * made it — the point is to see `completed` and `stoppedAt`, not just the
 * animation.
 */

function formatResult(result: CloseAllResult): string {
  const closed = result.closed.length ? result.closed.join(', ') : '(none)';
  const stopped = result.stoppedAt ? `\nstoppedAt: ${result.stoppedAt}` : '';
  return `completed: ${result.completed}\nclosed: [${closed}]${stopped}`;
}

export const PartialCloseDemo = forwardRef<BottomSheetMethods>((_, ref) => (
  <PartialCloseLevel ref={ref} level={1} />
));

interface LevelProps {
  level: number;
  /** ID of level 1, threaded down so deeper levels can aim `closeTo` at it. */
  rootId?: string;
}

const PartialCloseLevel = forwardRef<BottomSheetMethods, LevelProps>(
  ({ level, rootId }, ref) => {
    const { open, closeAll, closeTo, closeDepth } = useBottomSheetManager();
    const { id, close, closeAbove } = useBottomSheetContext();

    const [lastResult, setLastResult] = useState('no call yet');
    const [inclusive, setInclusive] = useState(false);
    const [blocking, setBlocking] = useState(false);

    // Lets a level refuse, so a cascade can be stopped mid-way and `stoppedAt`
    // observed rather than taken on faith.
    useOnBeforeClose(({ onCancel, onConfirm }) =>
      blocking ? onCancel() : onConfirm()
    );

    const target = rootId ?? id;

    const report = async (call: Promise<CloseAllResult>) =>
      setLastResult(formatResult(await call));

    const pushLevel = () =>
      open(<PartialCloseLevel level={level + 1} rootId={target} />, {
        mode: 'push',
        scaleBackground: true,
      });

    return (
      <Sheet ref={ref}>
        <View style={styles.badges}>
          <Badge label={`level ${level}`} color={colors.primary} />
          {blocking ? <Badge label="blocking" color={colors.warning} /> : null}
        </View>

        <Text style={sharedStyles.h1}>Partial close · level {level}</Text>
        <Text style={sharedStyles.text}>
          Push a few levels, then close part of the stack.
        </Text>

        <View style={sharedStyles.contextBox}>
          <Text style={sharedStyles.contextTitle}>LAST RESULT</Text>
          <Text style={sharedStyles.contextValue}>{lastResult}</Text>
        </View>

        <View style={styles.toggle}>
          <Text style={sharedStyles.text}>Refuse to close (interceptor)</Text>
          <Switch value={blocking} onValueChange={setBlocking} />
        </View>
        <View style={styles.toggle}>
          <Text style={sharedStyles.text}>inclusive</Text>
          <Switch value={inclusive} onValueChange={setInclusive} />
        </View>

        <Button title="Push next level" onPress={pushLevel} />

        <Text style={sharedStyles.contextTitle}>FROM INSIDE THIS SHEET</Text>
        <Button
          title="closeAbove() — everything above me"
          onPress={() => report(closeAbove({ stagger: 120, inclusive }))}
        />

        <Text style={sharedStyles.contextTitle}>BOUNDED BY ID</Text>
        <Button
          title="closeTo(level 1)"
          onPress={() => report(closeTo(target, { stagger: 120, inclusive }))}
        />
        <Button
          title="closeTo('missing') — unknown id closes nothing"
          onPress={() => report(closeTo('missing', { stagger: 120 }))}
        />

        <Text style={sharedStyles.contextTitle}>BOUNDED BY COUNT</Text>
        <Button
          title="closeDepth(1)"
          onPress={() => report(closeDepth(1, { stagger: 120 }))}
        />
        <Button
          title="closeDepth(3)"
          onPress={() => report(closeDepth(3, { stagger: 120 }))}
        />
        <Button
          title="closeDepth(0) — closes nothing"
          onPress={() => report(closeDepth(0, { stagger: 120 }))}
        />
        <Button
          title="closeDepth(99) — clamps to the stack"
          onPress={() => report(closeDepth(99, { stagger: 120 }))}
        />

        <Text style={sharedStyles.contextTitle}>BOTH BOUNDS</Text>
        <Button
          title="until level 1 + depth 1 — narrower wins"
          onPress={() =>
            report(closeAll({ stagger: 120, until: target, depth: 1 }))
          }
        />

        <SecondaryButton
          title="closeAll()"
          onPress={() => report(closeAll({ stagger: 120 }))}
        />
        <SecondaryButton title="Close this one" onPress={close} />
      </Sheet>
    );
  }
);

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
