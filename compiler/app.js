import React from 'react'
import { version, camelize, capitalize, hyphenate } from './runtime-bridge.js'

export const CompositionContext = React.createContext({})
CompositionContext.displayName = 'VueContext'

export function initGlobalConfig() {
    return {
        $root:      null,
        provides:   {},
        components: {},
        directives: {},
        mixins:     [],
        config: {
            errorHandler:           null,
            warnHandler:            null,
            performance:            true,
            compilerOptions:        {},
            globalProperties:       {},
            optionMergeStrategies:  {},
        }
    }
}

export const GlobalContext = initGlobalConfig() // React.createContext({})
// GlobalContext.displayName = 'VueGlobalContext'

export function attachApp(component, props = {}) {
    var global_config = GlobalContext // initGlobalConfig()
    props.ref = (app) => {
        global_config.$root = app && app._vm || app
    }

    const App = function() {
        return React.createElement(component, props)
    }

    App.version = version
    App.config = global_config.config

    App.mount = () => App
    App.unmount = () => App

    App.provide = (key, value) => {
        global_config.provides[key] = value // toDo use context provider
        return App
    }

    // register global component
    App.component = (name, component) => {
        if(component) {
            const PascalName = capitalize(camelize(name))
            // component.displayName = component.displayName || name

            global_config.components[name] = component
            global_config.components[PascalName] = component
            global_config.components[hyphenate(PascalName)] = component
            return App
        }

        return global_config.components[name]
    }

    // register global directive
    App.directive = (name, directive) => {
        if(directive) {
            const PascalName = capitalize(camelize(name))

            global_config.directives[name] = directive
            global_config.directives[PascalName] = directive
            global_config.directives[hyphenate(PascalName)] = directive
            return App
        }

        return global_config.directives[name]
    }

    App.use = (plugin, options) => {
        if(plugin && plugin.install) {
            plugin.install(App, options)
        }

        return App
    }

    App.mixin = (config) => {
        global_config.mixins.push(config)
        return App
    }

    return App
}