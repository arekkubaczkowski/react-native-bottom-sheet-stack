import fs from 'fs';
import path from 'path';
import { StyleSheet } from 'react-native';

// React Native 0.88 removed `StyleSheet.absoluteFillObject`. Spreading it is
// silent: gorhom < 5.2.14 builds its hosting container from it, the container
// loses `position: 'absolute'`, measures 0 tall, and the sheet never appears
// while the manager's backdrop does. Nothing in a mocked render shows that, so
// this reads the installed gorhom build instead.

const STYLE_SHEET_CONSTANTS = ['absoluteFillObject', 'absoluteFill'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

describe('@gorhom/bottom-sheet against the installed React Native', () => {
  it('uses no StyleSheet constant that React Native no longer exports', () => {
    const removed = STYLE_SHEET_CONSTANTS.filter(
      (name) => (StyleSheet as Record<string, unknown>)[name] === undefined
    );
    const gorhomRoot = path.dirname(
      require.resolve('@gorhom/bottom-sheet/package.json')
    );

    const offenders = sourceFiles(path.join(gorhomRoot, 'lib')).flatMap(
      (file) => {
        const source = fs.readFileSync(file, 'utf8');
        return removed
          .filter((name) => source.includes(`StyleSheet.${name}`))
          .map((name) => `${path.relative(gorhomRoot, file)}: ${name}`);
      }
    );

    expect(offenders).toEqual([]);
  });
});
