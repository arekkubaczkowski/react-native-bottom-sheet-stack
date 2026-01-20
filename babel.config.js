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
  ],
};
