const constantObject = {
  regExpForValidCrnaDirectory: /^[a-zA-Z0-9\-]+$/,
  regExpForValidRnDirectory: /^[$A-Z_][0-9A-Z_$]*$/i,
  crnaPackageName: "expo",
  rnPackageName: "react-native",
  stableRNVersion: "react-native@0.63",
  appJsonPath: "app.json",
  vueNativePackages: {
    vueNativeRuntime: "@vue-native3/runtime",
    vueNativeCompiler: "@vue-native3/compiler"
  },
  rnPkgCliFileName: "rn-cli.config.js",
  metroConfigFile: "metro.config.js",
  vueTransformerFileName: "vueTransformerPlugin.js",
  appFileName: "App.js",
  mainVueFileName: "main.vue",
  expoAppJSONSourceExtsPath: "expo.packagerOpts.sourceExts",
  vueFileExtensions: ["vue"],
};

module.exports = constantObject;
