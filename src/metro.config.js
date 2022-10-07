const { getDefaultConfig } = require('@expo/metro-config')
const { merge } = require('./packages/vue-native-compiler/main.js')

var config = getDefaultConfig(__dirname)
config = merge(config)

config.transformer.vue = {
    // saveJS: true,
}

module.exports = config