const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = function (api) {
  api.cache(true);

  // RNBB adds babel-plugin-module-resolver in an override that aliases
  // the package name to src/index.tsx. That prefix-matches subpath imports
  // too (e.g. "pkg/gorhom" → "src/index.tsx/gorhom" — broken).
  //
  // Adding a separate module-resolver as a base plugin runs BEFORE the
  // override, so subpath imports resolve to the correct adapter directories
  // before RNBB's alias can mangle them.
  return getConfig(
    {
      presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
      plugins: [
        [
          require.resolve('babel-plugin-module-resolver'),
          {
            alias: {
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
          'subpath-aliases',
        ],
        // The example consumes the library from `src/`, so without this the
        // code under test runs unmemoized — nothing like the compiled `lib/`
        // a consumer installs, and any render profiling here measures a build
        // that ships to nobody. No panicThreshold: the library's own build
        // enforces that, and the example must not fail to bundle over it.
        ['babel-plugin-react-compiler', { target: '19' }],
        'react-native-reanimated/plugin',
      ],
    },
    { root, pkg }
  );
};
