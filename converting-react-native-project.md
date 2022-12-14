## Setting up a React Native project for Vue Native

[Vue Native CLI](https://github.com/chainius/vue-native-cli) is the recommended way to setup a new Vue Native project. However, if you wish to setup a project from scratch, use the following steps after setting up a React Native / Expo project.

### Step 1: Install

The following packages are required as runtime dependencies by Vue Native:
- [@vue-native3/runtime](https://www.npmjs.com/package/@vue-native3/runtime)

During development, another package is required to transpile Vue Native component files (with `.vue` extensions) into JS:
- [@vue-native3/compiler](https://www.npmjs.com/package/@vue-native3/compiler)

To install them, run the following commands in your project directory
```
$ npm install --save @vue-native3/runtime
$ npm install --save-dev @vue-native3/compiler
```

### Step 2: Configure the React Native bundler

The Metro bundler is used by React Native to generate app bundles. It can be configured using a `metro.config.js` file. Add the following to your `metro.config.js` (make one to your project's root if you don't have one already):

```js
const { getDefaultConfig } = require('@expo/metro-config')
const registerVueCompiler = require('@vue-native3/compiler')

var config = getDefaultConfig(__dirname)

module.exports = registerVueCompiler(config)
```

#### NOTE to Expo users:

The `app.json` file must be modified to allow `.vue` files to be recognised.

```diff
{
  "expo": {
    "sdkVersion": "34.0.0",
    "platforms": [
      "ios",
      "android",
      "web"
    ],
    ...
    "packagerOpts": {
+     "sourceExts": ["js", "json", "ts", "tsx", "vue"],
      "config": "metro.config.js"
    }
  }
}
```




## Using Vue Native components and `.vue` files

In the React Native application, you can simply `import` your Vue components as follows

```
import VueComponent from './VueComponent.vue'
```

There should be a file named `VueComponent.vue` in the corresponding folder; the transformer parses this file and sends it to the React Native bundler.

## Global vue config

In vue3 an application should be created in order to setup global scoped configs.
We recommend to create a vue app on the root of your project.
Global components, directives or other vue compatible configs can be putted on that app.

```js
import { createApp } from 'vue'
import main from './src/main.vue'

const App = createApp(main)
// App.component('Lvl1', Lvl1)
export default App
```

Note, it's also possible to use a react component during the root app declaration.
The config used on the app will still be used on nested vue elements.

```js
import { createApp } from 'vue'
import React, { View, Text } from 'react-native'

function MyApp() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Hello World</Text>
        </View>
    )
}

const App = createApp(MyApp)
// App.component('Lvl1', Lvl1)

export default App
```

### Adding rollup plugins

If you want to use some rollup plugins, you can extends the metro config file.
He is a small sample how to add a rollup plugin:

```js
const { getDefaultConfig } = require('@expo/metro-config')
const registerVueCompiler = require('@vue-native3/compiler')
const myPlugin = require('my-plugin')

var config = getDefaultConfig(__dirname)

config.vue = {
  plugins: [
    myPlugin,
  ],
  // templateOptions: { ... },
}

module.exports = registerVueCompiler(config)
```