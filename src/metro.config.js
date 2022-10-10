const { getDefaultConfig } = require('@expo/metro-config')
const registerVueCompiler = require('./packages/vue-native-compiler/main.js')

var config = getDefaultConfig(__dirname)

// add dev alias
config.resolver.resolveRequest = (context, moduleName, platform) => { 
    if(moduleName == '@vue-native3/runtime') {
        return {
            filePath: require.resolve('./packages/vue-native-runtime/index.js'),
            type:     'sourceFile',
        }
    }

    return context.resolveRequest(context, moduleName, platform)
}

config.transformer.vue = {
    // saveJS:  true,
    // plugins: [
    //     require('../test/plugins/graphql').rollup(),
    // ],
    // templateOptions: {
    //     compilerOptions: {
    //         nodeTransforms(node) {
    //             console.log('transform node', node)
    //         }
    //     }
    // }
}

module.exports = registerVueCompiler(config)