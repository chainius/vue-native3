var config = require('../../../scripts/config.js')
config = config.getBuild('vue-native-compiler')

config.output.file = 'transform.js'

module.exports = config