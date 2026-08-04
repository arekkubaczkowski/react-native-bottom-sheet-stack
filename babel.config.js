module.exports = {
  presets: ['module:react-native-builder-bob/babel-preset'],
  env: {
    // Jest transforms both our sources and the react-native runtime it pulls
    // in. The builder-bob preset targets library output and does not parse the
    // Flow syntax RN 0.81 ships in its own jest mocks, so tests use React
    // Native's preset instead. Build output is unaffected: this branch is only
    // active when NODE_ENV=test, which bob never sets.
    test: {
      presets: ['module:@react-native/babel-preset'],
    },
  },
  plugins: [
    [
      'babel-plugin-react-compiler',
      {
        target: '19',
        panicThreshold: 'all_errors',
      },
    ],
    // NOTE: We intentionally do NOT run 'react-native-worklets/plugin' here.
    // Pre-compiling worklets in a published library bakes the plugin version
    // into the shipped code (`__pluginVersion`), which then mismatches any
    // consumer whose react-native-worklets version differs, crashing with
    // "Mismatch between JavaScript code version and Worklets Babel plugin
    // version" (see issue #37). Per Software Mansion's guidance, libraries must
    // ship un-transpiled worklets and let the consuming app's Babel plugin
    // transform them. To also avoid the namespace-capture crash that pre-
    // compilation was papering over (issue #34 — CJS turns named worklets
    // imports into `_reactNativeWorklets.x` member access that the consumer's
    // plugin captures wholesale), we ship an ESM `module` build (see the
    // react-native-builder-bob `targets` in package.json) that preserves named
    // imports so the consumer's plugin hoists them correctly.
  ],
};
