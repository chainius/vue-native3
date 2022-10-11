// extend metro config to include vue compiler
module.exports = function configure(config) {
    // add vue extension to src extensions
    config.resolver = config.resolver || {}
    config.resolver.sourceExts = config.resolver.sourceExts || ['js', 'json', 'js', 'ts', 'tsx']
    config.resolver.sourceExts.push('vue')

    // alias vue to @vue-native3/runtime
    var upperResolver = config.resolver.resolveRequest
    config.resolver.resolveRequest = (context, moduleName, platform) => {
        if(moduleName == 'vue')
            moduleName = '@vue-native3/runtime'

        if(upperResolver)
            return upperResolver.call(this, context, moduleName, platform)

        // chain to the standard Metro resolver.
        return context.resolveRequest(context, moduleName, platform)
    }

    // transform vue files
    config.transformer = config.transformer || {}
    config.transformer.upstreamTransformer = config.transformer.babelTransformerPath || 'metro-react-native-babel-transformer'
    config.transformer.babelTransformerPath = require.resolve('./transform.js')

    if(config.transformer.upstreamTransformer == config.transformer.babelTransformerPath)
        delete config.transformer.upstreamTransformer

    return config
}

// wrapper arround SFC parser to support native & web attributes to filter templates/styles/scripts/...
function parser(mode) {
    const CompilerDOM = require('@vue/compiler-dom')
    const parse = require('@vue/compiler-sfc').parse
    const remove_tags = mode == 'native' ? 'web' : 'native'

    return function(data, options) {
        options = Object.assign({
            compiler: {
                parse(source, options) {
                    const res = CompilerDOM.parse(source, options)
                    res.children = res.children.filter((o) => !o.props || !o.props.find((r) => r.name == remove_tags))
                    return res
                }
            }
        }, options)
  
        return parse(data, options)
    }
}

module.exports.parser = parser

// create new compiler with customer parser
module.exports.compiler = (mode) => {
    const compiler = require('@vue/compiler-sfc')
    compiler.parse = parser(mode)
    return compiler
}