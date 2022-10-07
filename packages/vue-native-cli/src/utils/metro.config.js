/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('@expo/metro-config')
const registerVueCompiler = require('@vue-native3/compiler')

var config = getDefaultConfig(__dirname)

module.exports = registerVueCompiler(config)