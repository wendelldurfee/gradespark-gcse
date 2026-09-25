module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    // react-native-worklets/plugin must stay last — it powers Reanimated 4 worklets
    // used by the drag-and-drop question renderer.
    plugins: ['react-native-worklets/plugin'],
  };
};
