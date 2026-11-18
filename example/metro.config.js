const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const root = path.resolve(__dirname, '..');

const defaultConfig = getDefaultConfig(__dirname);
const bobConfig = getConfig(defaultConfig, {
  root,
  pkg,
  project: __dirname,
});

// react-native-builder-bob blocks the root copies of every peer dependency so
// the example bundles exactly one of each, but it does so through
// `resolver.blacklistRE`, which Metro 0.87 removed and now ignores. Without
// the block, `src/` resolves peers such as zustand and @gorhom/bottom-sheet
// from the root and the app from example/node_modules — two copies of each in
// one bundle.
const { blacklistRE, ...resolver } = bobConfig.resolver;
const config = {
  ...bobConfig,
  resolver: {
    ...resolver,
    blockList: [
      ...[defaultConfig.resolver.blockList ?? []].flat(),
      blacklistRE,
    ],
  },
};

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = wrapWithReanimatedMetroConfig(config);
