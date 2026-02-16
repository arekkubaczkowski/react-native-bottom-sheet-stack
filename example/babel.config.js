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
            },
          },
          'subpath-aliases',
        ],
        'react-native-reanimated/plugin',
      ],
    },
    { root, pkg }
  );
};
