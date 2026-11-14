const path = require('path');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const librarySource = path.join(root, pkg['react-native-builder-bob'].source);

// This mirrors react-native-builder-bob's `babel-config` helper, which the
// example cannot use: it scopes its overrides with RegExp/string patterns, and
// Expo's transformer loads this config without a filename to compute its cache
// key — Babel refuses to evaluate such patterns then. Function predicates are
// evaluated (and simply do not match) without one.
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      [
        require.resolve('babel-plugin-module-resolver'),
        {
          // The main entry is matched exactly: a prefix alias would also
          // rewrite the subpaths ("pkg/gorhom" → "src/index.tsx/gorhom").
          alias: {
            [`^${pkg.name}$`]: path.join(root, pkg.source),
            [`${pkg.name}/gorhom`]: path.resolve(
              root,
              'src/adapters/gorhom-sheet'
            ),
            [`${pkg.name}/react-native-modal`]: path.resolve(
              root,
              'src/adapters/react-native-modal'
            ),
            [`${pkg.name}/actions-sheet`]: path.resolve(
              root,
              'src/adapters/actions-sheet'
            ),
            [`${pkg.name}/swmansion`]: path.resolve(
              root,
              'src/adapters/swmansion'
            ),
            [`${pkg.name}/testing`]: path.resolve(root, 'src/testing'),
          },
        },
      ],
      // The example consumes the library from `src/`, so without this the
      // code under test runs unmemoized — nothing like the compiled `lib/`
      // a consumer installs, and any render profiling here measures a build
      // that ships to nobody. No panicThreshold: the library's own build
      // enforces that, and the example must not fail to bundle over it.
      ['babel-plugin-react-compiler', { target: '19' }],
      'react-native-reanimated/plugin',
    ],
    overrides: [
      {
        test: (filename) =>
          filename != null &&
          filename.startsWith(`${librarySource}${path.sep}`),
        presets: [
          [
            require.resolve('react-native-builder-bob/babel-preset'),
            // Leaves the module transform to babel-preset-expo.
            { supportsStaticESM: true },
          ],
        ],
      },
    ],
  };
};
