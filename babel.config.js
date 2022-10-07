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
                        vue: './compiler/runtime.js',
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
                    ],
                },
            ],
        ],
    }
}
