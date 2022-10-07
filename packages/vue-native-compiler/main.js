const { mergeConfig } = require("metro-config");
var defExtensions = ["js", "json", "ts", "tsx"];

function config(exts = defExtensions) {
  return {
    serializer: {},
    server: {},
    resolver: {
      sourceExts: exts.concat(["vue"]),
    },
    transformer: {
      babelTransformerPath: require.resolve("./transform.js"),
    },
  };
}

module.exports = {
  config,
  merge(newConfig) {
    return mergeConfig(
      newConfig,
      config(newConfig.resolver.sourceExts || defExtensions)
    );
  },
};
