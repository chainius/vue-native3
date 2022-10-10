import fs from 'fs'
import path from 'path'
import { rollup } from 'rollup'
import vue from './plugin.mjs'

// exports compiler
export default vue

var projectConfigs = {}

async function compile(config, vueConfig) {
    const parserConfig = {
        filename:        path.basename(config.filename),
        mode:            'native',
        content:         config.src,
        templateOptions: vueConfig.templateOptions,
    }
    
    const bundle = await rollup({
        input:   parserConfig.filename, // resolved by our plugin
        plugins: [
            vue.rollup(parserConfig),
            ...(vueConfig.plugins || []),
        ],
        output: [{
            file:   parserConfig.filename + ".js",
            format: 'es'
        }],
    })

    const res = await bundle.generate({
        sourcemap: true,
        format:    'es'
    })

    return res.output[0]
}

// forward to babel transformer
function upstreamTransform(config, metroConfig) {
    const transformer = config.upstreamTransformer || require(metroConfig.transformer.upstreamTransformer || 'metro-react-native-babel-transformer')
    return transformer.transform(config)
}

// metro bundler transformer
export async function transform(config) {
    
    // load project config
    var metroConfig = projectConfigs[config.options.projectRoot]
    if(!metroConfig) {
        metroConfig = {}

        try {
            metroConfig = require(config.options.projectRoot + '/metro.config')
        } catch(e) {
            console.error("could not load metro config", e)
        }

        projectConfigs[config.options.projectRoot] = metroConfig
    }

    // transform vue files
    if(config.filename.endsWith('.vue')) {
        var vueConfig = metroConfig.transformer?.vue || {}
        var app = await compile(config, vueConfig)

        // debug compiled code
        if(vueConfig.saveJS && app.code) {
            fs.writeFileSync(config.filename + '.js', app.code)

            const src = JSON.stringify("./" + path.basename(config.filename) + '.js')
            app.code = "import App from " + src + "\nexport default App\nexport * from " + src
        }

        config.src = app.code || ''
    }

    return upstreamTransform(config, metroConfig)
}