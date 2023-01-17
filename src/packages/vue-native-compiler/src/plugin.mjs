import { parse as SFCParse, compileStyle, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { parse as nativeParse } from '@vue/compiler-dom'
import transform_css from 'css-to-react-native-transform'
import { createUnplugin } from 'unplugin'
import mergeTemplateOptions from './merge-template-options.mjs'

// wrapper arround SFC parser to support native & web attributes to filter templates/styles/scripts/...
export function parse(data, options) {
    const remove_tags = options.mode == 'native' ? 'web' : 'native'

    options = Object.assign({
        compiler: {
            parse(source, options) {
                const res = nativeParse(source, options)
                res.children = res.children.filter((o) => !o.props || !o.props.find((r) => r.name == remove_tags))
                return res
            }
        }
    }, options)

    return SFCParse(data, options)
}

const standardTemplateOptions = {
    compilerOptions: {
        nodeTransforms(node, context) {
            if(node.type == 3) {
                context.removeNode(node)
            }
        },
        isNativeTag() {
            return false
        }
    },
}

// --------------------------------------------

function generateStyle(app, id, shortID) {
    var style = compileStyle({
        id:     id,
        source: app.styles.reduce((a, b) => a + b.content + "\n", "").trim(' '),
    })

    style = transform_css.default(style.code)

    const styles = style
    style = `import { StyleSheet } from 'react-native';\n`

    if(app.cssVars.length == 0) {
        return style + `export default StyleSheet.create(${JSON.stringify(styles, null, 4)})`
    }

    // bind css values to stylesheet
    var cssColors = {}
    for(var x of app.cssVars) {
        const id = `${shortID}-${x.split('.').join('_')}`
        cssColors[`var(--${id})`] = `stylesheet[${JSON.stringify(id)}]`
    }

    style = style + `export default function style(stylesheet) {\n    return StyleSheet.create({\n`
    for(var key in styles) {
        style = style + `        ${JSON.stringify(key)}: {\n`
        for(var key2 in styles[key]) {
            var val = styles[key][key2]
            val = cssColors[val] || JSON.stringify(val)
            style = style + `            "${key2}": ${val},\n`
        }

        style = style + `        },\n`
    }

    return style + "\n    })\n}"
}

function genImport(parserConfig, name, kind) {
    return `import ${name} from ${JSON.stringify(parserConfig.filename+'?' + kind)}\n`
}

// --------------------------------------------

// plugin to compile vue files
export default createUnplugin((parserConfig) => {
    const templateOptions = mergeTemplateOptions(standardTemplateOptions, parserConfig.templateOptions)
    const app = parse(parserConfig.content, parserConfig).descriptor

    const shortID = Math.random().toString(36).substr(2, 10)
    const id = 'data-v-' +shortID

    return {
        name: 'vue',
        // webpack's id filter is outside of loader logic,
        // an additional hook is needed for better perf on webpack
        transformInclude(id) {
            return id.endsWith('.vue')
        },
        // just like rollup transform
        resolveId(source) {
            if(source == parserConfig.filename || source.startsWith(parserConfig.filename + '?'))
                return source

            return { id: source, external: true }
        },
        load(path) {
            // generate top level vue parts combiner
            if (path === parserConfig.filename) {
                var code = ""

                // add template & script
                if(app.scriptSetup || (app.script && !app.template)) {
                    code = genImport(parserConfig, "options", "script")
                } else if (app.script) {
                    code = genImport(parserConfig, "{ render }", "template")
                    code = code + genImport(parserConfig, "options", "script")
                    code = code + "options.render = render\n\n"
                } else if (app.template) {
                    code = genImport(parserConfig, "{ render }", "template")
                    code = code + "var options = { render }\n\n"
                } else {
                    code = "var options = {}\n\n"
                }

                // add styelsheet
                if(app.styles.length > 0) {
                    code = code + genImport(parserConfig, 'stylesheet', 'style')
                    code = code + "options.stylesheet = stylesheet\n\n"
                }

                // add plugins
                for(var i in app.customBlocks) {
                    const block = app.customBlocks[i]
                    code = code + genImport(parserConfig, 'block' + i, "type=" + block.type + '&index=' + i)
                    code += "typeof(block" + i + ") == 'function' && block" + i + "(options)"
                }

                return code + `
                    import { defineComponent } from 'vue'
                    export default defineComponent(options)
                `
            }

            // ---

            path = path.substr(parserConfig.filename.length + 1)

            // generate style part
            if (path === 'style') {
                return generateStyle(app, id, shortID)
            }

            // generate script part
            if (path === 'script') {
                const script = compileScript(app, {
                    id:              id,
                    inlineTemplate:  true,
                    prod:            true,
                    templateOptions: templateOptions,
                })

                return {
                    code: script.content,
                    map:  script.map,
                    // ast:  script.ast,
                }
            }

            // generate template part when no script is available
            if (path === 'template') {
                const template = compileTemplate({
                    id:              id,
                    filename:        parserConfig.filename,
                    source:          app.template.content,
                    ssr:             false,
                    isProd:          true,
                    compilerOptions: templateOptions.compilerOptions,
                })

                return {
                    code: template.code,
                    // map:  template.map,
                    // ast:  template.ast,
                }
            }

            if(path.startsWith('type=')) {
                // const block = path.split('&')[0].split('=')[1]
                const index = parseInt(path.split('&')[1].split('=')[1])

                return {
                    code: app.customBlocks[index].content,
                    map:  app.customBlocks[index].map,
                }
            }

            // generate custom blocks
            return null
        }
    }
})