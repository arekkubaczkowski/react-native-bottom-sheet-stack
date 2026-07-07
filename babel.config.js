module.exports = {
  presets: ['module:react-native-builder-bob/babel-preset'],
  plugins: [
    [
      'babel-plugin-react-compiler',
      {
        target: '19',
        panicThreshold: 'all_errors',
      },
    ],
    // Pre-compile worklets so shipped CJS doesn't crash consumers with
    // "Cannot copy value of type NativeWorklets". Must run last.
    'react-native-worklets/plugin',
  ],
};
