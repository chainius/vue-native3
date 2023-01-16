import fs from 'fs'
import { rollup } from 'rollup'
import graphql from './plugins/graphql.js'
import vue from '../src/packages/vue-native-compiler/src/plugin.mjs'
import importer from './plugins/importer.js'

const parserConfig = {
    filename:        'main.vue',
    mode:            'native',
    content:         fs.readFileSync('../src/src/main.vue', 'utf8'),
    templateOptions: {
        compilerOptions: {
            nodeTransforms(node) {
                // apply filters only on js expressions
                // Current limitation: arguments of chained filters could not ends with a static expression, otherwise filters will not be applied correctly
                // example: {{ test | testFunction(a, b, 'x') | myFn('test') }} => the last filter myFn will not be correctly compiled
                if(node.type == 5) {
                    var changed = true
                    while(changed) {
                        changed = false

                        for(var i in node.content.children) {
                            var child = node.content.children[i]
    
                            if(i > 0 && typeof(child) == 'string' && child.trim(' ') == '|') {
                                node.content.children = wrapFilter(node.content.children, i)
                                changed = true
                                break
                            }
                        }
                    }
                }
            },
        },
    }
}

function wrapFilter(children, i) {
    var next = []
    if(i == children.length - 1) {
        return children
    }

    var before = children.slice(0, i)
    
    i++
    children[i].content = '_ctx.$filters.' + children[i].loc.source
    var next = [children[i]]
    var added = false

    while(i < children.length - 1) {
        if(typeof(children[i+1]) != 'string')
            break

        if(children[i+1] == '.') {
            i++
            next.push(children[i])
            i++
            next.push(children[i])
        } else if(!children[i+1].startsWith('(')) {
            break
        }

        i++
        next.push('(')
        next = next.concat(before)
        children[i] = children[i].substring(1).trim(' ')
        added = true

        if(children[i] == ')') {
            next.push(')')
            break
        } else {
            next.push(', ' + children[i])
        }

        while(i < children.length - 1) {
            if(typeof(children[i+1]) != 'string' || !children[i+1].trim(' ').startsWith(')')) {
                i++
                next.push(children[i])
                continue
            }

            if(children[i+1].trim(' ') == ')') {
                i++
                next.push(children[i])
                break
            } else {
                next.push(')')
                children[i+1] = children[i+1].trim(' ').substring(1)
                break
            }
        }

        break
    }

    if(!added) {
        next.push('(')
        next = next.concat(before)
        next.push(')')
    }

    i++
    if(i < children.length) {
        next = next.concat(children.slice(i))
    }

    return next
}

// ----------------------------

const config = {
    input:   parserConfig.filename, // resolved by our plugin
    plugins: [
        vue.rollup(parserConfig),
        graphql.rollup(),
        importer.rollup(),
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