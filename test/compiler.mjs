import fs from 'fs'
import { rollup } from 'rollup'
import graphql from './plugins/graphql.js'
import vue from '../src/packages/vue-native-compiler/plugin.mjs'

const parserConfig = {
    filename:        'main.vue',
    mode:            'native',
    content:         fs.readFileSync('../src/src/main.vue', 'utf8'),
    templateOptions: {
        compilerOptions: {
            nodeTransforms(node) {
                if(node.type == 5) {
                    // console.log(JSON.stringify(node.content.children, null, 4))
                    // node.content.children = [
                    //     {
                    //         "type": 4,
                    //         "loc": {
                    //             "source": "msg",
                    //             "start": {
                    //                 "column": 47,
                    //                 "line": 3,
                    //                 "offset": 76
                    //             },
                    //             "end": {
                    //                 "column": 50,
                    //                 "line": 3,
                    //                 "offset": 79
                    //             }
                    //         },
                    //         "content": "_ctx.$filters.test(_ctx.msg)",
                    //         "isStatic": false,
                    //         "constType": 0
                    //     }
                    // ]
                }
            },
        },
    }
}

// ----------------------------

const config = {
    input:   parserConfig.filename, // resolved by our plugin
    plugins: [
        vue.rollup(parserConfig),
        graphql.rollup(),
    ],
    output: [{
        file:   'bundle.js',
        format: 'es'
    }],
    perf: false,
}

function now() {
    return Date.now()
}

async function build() {
    // console.log('pre start after', now() - start)

    const start = now()
    const bundle = await rollup(config)

    // console.log('input after', now() - start)

    const res = await bundle.generate({
        sourcemap: true,
        format:    'es'
    })

    console.log('output after', now() - start)

    // console.log(bundle.getTimings())

    fs.writeFileSync('bundle.js', res.output[0].code)
}

async function main() {
    await build()
    // await build()
    // await build()
}

main().catch(console.error)