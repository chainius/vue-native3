// extend metro config to include vue compiler
module.exports = function configure(config) {
  // add vue extension to src extensions
  config.resolver = config.resolver || {};
  config.resolver.sourceExts = config.resolver.sourceExts || [
    "js",
    "json",
    "js",
    "ts",
    "tsx",
  ];
  config.resolver.sourceExts.push("vue");

  // alias vue to @vue-native3/runtime
  var upperResolver = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName == "vue") moduleName = "@vue-native3/runtime";

    if (upperResolver)
      return upperResolver.call(this, context, moduleName, platform);

    // chain to the standard Metro resolver.
    return context.resolveRequest(context, moduleName, platform);
  };

  // transform vue files
  config.transformer = config.transformer || {};
  config.transformer.upstreamTransformer =
    config.transformer.babelTransformerPath ||
    "metro-react-native-babel-transformer";
  config.transformer.babelTransformerPath = require.resolve("./transform.js");

  return config;
};
