const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Question banks are shipped and imported as plain .json, already handled by
// Metro's default sourceExts. Allow raw .txt/.csv dumps to be bundled too so the
// sample ExamTopics-style dump can be read straight from the asset registry.
//
// `wasm` is required for the web target: expo-sqlite runs SQLite through a
// WebAssembly build, and its worker imports the .wasm file as an asset.
config.resolver.assetExts.push('txt', 'csv', 'vceq', 'wasm');

module.exports = config;
