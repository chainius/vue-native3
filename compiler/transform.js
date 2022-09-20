const SFC = require('@vue/compiler-sfc')
const CompilerDOM = require('@vue/compiler-dom')
const transform_css = require('css-to-react-native-transform')
const fs = require('fs')
var upstreamTransformer = require("metro-react-native-babel-transformer")

// wrapper arround SFC parser to support native & web attributes to filter templates/styles/scripts/...
function parse(data, options) {
    const remove_tags = options.mode == 'native' ? 'web' : 'native'

    options = Object.assign({
        compiler: {
            parse(source, options) {
                const res = CompilerDOM.parse(source, options)
                res.children = res.children.filter((o) => !o.props.find((r) => r.name == remove_tags))
                return res
            }
        }
    }, options)

    return SFC.parse(data, options)
}

// parse vue file and return final script and stylesheet file content
function compile(data, options = {}) {
    const shortID = Math.random().toString(36).substr(2, 10)
    const id = 'data-v-' +shortID
    const filename = options.filename && options.filename.substr(options.filename.lastIndexOf('/')+1) || 'index.vue'
    const name = filename.substr(0, filename.lastIndexOf('.'))

    // Parse a vue file
    const app = parse(data, {
        filename: filename,
        mode:     options.mode || 'native', // native or web
    }).descriptor

    const res = {}

    // Add CSS to React Native
    var style = app.styles.reduce((a, b) => a + b.content + "\n", "").trim(' ')
    if(style != '') {
        style = SFC.compileStyle({
            id:     id,
            source: style,
        }).code

        style = transform_css.default(style)

        if(Object.keys(style).length > 0 ) {
            const styles = style
            style = `import { StyleSheet as __REACT_STYLESHEET__ } from 'react-native';\n`

            if(app.cssVars.length == 0) {
                style = style + `const __VUE_STYLESHEET__ = __REACT_STYLESHEET__.create(${JSON.stringify(styles, null, 2)}\n\n`
            } else {
                var cssColors = {}
                for(var x of app.cssVars) {
                    const id = `${shortID}-${x.split('.').join('_')}`
                    cssColors[`var(--${id})`] = `stylesheet[${JSON.stringify(id)}]`
                }

                style = style + `function __VUE_STYLESHEET__(stylesheet) {\n    return __REACT_STYLESHEET__.create({\n`
                for(var key in styles) {
                    style = style + `        ${JSON.stringify(key)}: {\n`
                    for(var key2 in styles[key]) {
                        var val = styles[key][key2]
                        val = cssColors[val] || JSON.stringify(val)
                        style = style + `            "${key2}": ${val},\n`
                    }
                    style = style + `        },\n`
                }

                style = style + "\n    })\n}\n\n"
            }
        } else {
            style = ''
        }
    }
    
    const templateOptions = {
        compilerOptions: {
            nodeTransforms(node, context) {
                if(node.type == 3) {
                    context.removeNode(node)
                }
            },
            // isBuiltInComponent(tag) {
            //     console.log('test build in', tag)
            //     return false
            // },
            isNativeTag() {
                return false
            }
        },
    }

    // Add scripts React Native
    if(app.script || app.scriptSetup) {
        res.script = SFC.compileScript(app, {
            id:              id,
            inlineTemplate:  true,
            prod:            true,
            templateOptions: templateOptions,
        })

        if(!app.scriptSetup && app.template) {
            res.script.content = SFC.rewriteDefault(res.script.content, '__DEFAULT_WITH_TEMPLATE__', [])

            const template = SFC.compileTemplate({
                filename:        app.filename,
                id:              id,
                source:          app.template.content,
                ssr:             false,
                isProd:          true,
                compilerOptions: templateOptions.compilerOptions,
                // inMap:           res.script.map,
                // scoped, slotted, inMap,  ssrCssVars,  compilerOptions = {}, transformAssetUrl
            })

            template.code = template.code.replace('export function render', 'function __TEMPLATE_RENDER__')
            res.script.content += "\n\n" + template.code + "\n\nexport default Object.assign({ render: __TEMPLATE_RENDER__, __name: "+JSON.stringify(name)
            if(style) {
                res.script.content += ", stylesheet: __VUE_STYLESHEET__"
            }

            res.script.content += " }, __DEFAULT_WITH_TEMPLATE__)"
        } else if(style && res.script.content.includes('export default __default__')) {
            res.script.content += "\n\n__default__.stylesheet = __VUE_STYLESHEET__" 
        } else if(style) {
            res.script.content = SFC.rewriteDefault(res.script.content, '__DEFAULT_WITH_TEMPLATE__', [])
            res.script.content += "\n\n__DEFAULT_WITH_TEMPLATE__.stylesheet = __VUE_STYLESHEET__\nexport default __DEFAULT_WITH_TEMPLATE__"
        }

        res.script = res.script.content
    } else if(app.template) {
        res.script = SFC.compileTemplate({
            filename:        app.filename,
            id:              id,
            source:          app.template.content,
            ssr:             false,
            isProd:          true,
            compilerOptions: templateOptions.compilerOptions,
            // scoped, slotted, inMap,  ssrCssVars,  compilerOptions = {}, transformAssetUrl
        })

        // generate script
        res.script = res.script.code + "\n\nexport default {\n  __name: " + JSON.stringify(name) + ",\n  render"
        if(style) {
            res.script += ",\n  stylesheet: __VUE_STYLESHEET__,\n}"
        } else {
            res.script += "\n}"
        }
    }

    // ToDo add custom blocks

    if(style != '') {
        res.script = style + res.script
    }

    return res
}

// exports compiler
module.exports = compile

// metro bundler transformer
module.exports.transform = function(config) {
    if(config.filename.endsWith('.vue')) {
        const base = config.filename.substr(0, config.filename.lastIndexOf('/'))
        var app = compile(config.src, config)

        app.script && fs.writeFileSync(base + "/script.js", app.script)

        config.src = fs.readFileSync('./test.vue/index.js', 'utf8')
    }

    return upstreamTransformer.transform(config)
}

// module.exports.transform({
//     filename: 'my-app/src/App.vue',
//     src: require('fs').readFileSync('./test.vue/index.vue').toString(),
//     options: {},
// })