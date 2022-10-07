/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('@expo/metro-config')
const { merge } = require('@vue-native3/compiler')

var config = getDefaultConfig(__dirname)
config = merge(config)

module.exports = config