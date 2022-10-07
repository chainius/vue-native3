const { getDefaultConfig } = require('@expo/metro-config')
var config = getDefaultConfig(__dirname)

config.resolver.sourceExts = ['js', 'json', 'ts', 'tsx', 'vue']

// config.transformer.hermesParser = true
config.transformer.babelTransformerPath = require.resolve("./compiler/transform.js")

config.transformer.vue = {
    // saveJS: true,
}

module.exports = config