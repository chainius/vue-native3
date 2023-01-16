const { createUnplugin } = require('unplugin')

module.exports = createUnplugin(() => ({
    name: 'imports',
    options(options) {
        options.onwarn = (warning) => {
            if(warning.code == 'UNUSED_EXTERNAL_IMPORT')
                return

            console.warn(warning)
        }
    },
    load(id) {
        if(id == 'main.vue?bridge') {
            const code = `export { app } from 'my-bridged-scripts'
            export { test } from 'my-second-scripts'`

            return {
                code,
                moduleSideEffects: false,
            }
        }

        return null
    },
    transformInclude (id) {
        return id.endsWith('.vue?script')
    },
    transform(code, id) {
        console.log(id)

        code = 'import { app, test } from "main.vue?bridge"\n' + code
        console.log(code)
        return {
            map: null,
            code,
        }
    }
}))