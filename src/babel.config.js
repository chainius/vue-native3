module.exports = function (api) {
    api.cache(true)
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // ... some other plugins
            [
                'module-resolver',
                {
                    root:  ['./'],
                    alias: {
                        vue: './packages/vue-native-runtime/index.js',
                    },
                    extensions: [
                        '.ios.js',
                        '.android.js',
                        '.js',
                        '.jsx',
                        '.json',
                        '.tsx',
                        '.ts',
                        '.native.js',
                        '.vue',
                    ],
                },
            ],
        ],
    }
}
