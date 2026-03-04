const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Force Metro to resolve .js (CJS) before .mjs (ESM) to avoid
// import.meta usage in ESM bundles (e.g. zustand) which Metro
// web bundler doesn't support.
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== "mjs"
);

module.exports = config;
