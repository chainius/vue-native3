const path = require('path')
const rolResolve = require('@rollup/plugin-node-resolve')
const prettier = require('rollup-plugin-prettier')

const resolve = p => {
    return path.resolve(__dirname, '../', p)
}

const builds = {
    'vue-native-runtime': {
        entry:    resolve('src/packages/vue-native-runtime/index.js'),
        dest:     resolve('packages/vue-native-runtime/build.js'),
        format:   'cjs',
        external: ['react', 'react-native', '@vue/shared'],
    },
    'vue-native-compiler': {
        entry:  resolve('src/packages/vue-native-compiler/transform.js'),
        dest:   resolve('packages/vue-native-compiler/build.js'),
        format: 'cjs',
    },
    // 'vue-native-scripts': {
    //     entry:    resolve('vue-native/scripts/index.js'),
    //     dest:     resolve('packages/vue-native-scripts/build.js'),
    //     format:   'cjs',
    //     external: []
    //         .concat(
    //             Object.keys(
    //                 require('../packages/vue-native-scripts/package.json').dependencies,
    //             ),
    //         )
    //         .concat(
    //             Object.keys(
    //                 require('../packages/vue-native-scripts/package.json')
    //                     .peerDependencies,
    //             ),
    //         ),
    // },
}

function genConfig(opts) {
    const config = {
        input:  opts.entry,
        output: {
            file:   opts.dest,
            format: opts.format,
            banner: opts.banner,
            name:   'vue',
            strict: false,
        },
        external: opts.external,
        plugins:  [
            rolResolve.default({
                nextjs: true,
            }),
            prettier(),
        ].concat(opts.plugins || []),
        onwarn: (msg, warn) => {
            if (!/Circular/.test(msg)) {
                warn(msg)
            }
        },
    }

    // if (opts.env) {
    //     config.plugins.push(
    //         replace({
    //             'process.env.NODE_ENV': JSON.stringify(opts.env),
    //         }),
    //     )
    // }

    return config
}

if (process.env.TARGET) {
    module.exports = genConfig(builds[process.env.TARGET])
} else {
    exports.getBuild = name => genConfig(builds[name])
    exports.getAllBuilds = () =>
        Object.keys(builds).map(name => genConfig(builds[name]))
}