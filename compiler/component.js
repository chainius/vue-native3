import React, { Component } from "react"
import { StyleSheet } from 'react-native'
import { watchEffect, ref, version, computed, nextTick, camelize, capitalize, hyphenate } from './runtime-bridge.js'
import { handleError } from './helpers/errors'
import merge from './helpers/merge-mixins'
import $watch from './helpers/watcher'
import init_props from './helpers/props'

var setCurrentInstance = () => {}
var getCurrentInstance = () => {}

const CompositionContext = React.createContext({})
CompositionContext.displayName = 'VueContext'

// const Context = React.createContext(null)

// react component wrapper to vue component
class VueReactComponent extends Component {

    // private properties
    #components = {}

    #directives = {}

    #stylesheet = {}

    #css_vars = () => ({})

    #hooks = {}

    #cache = {}

    #watch_render_options = {}

    #vm = {}

    #render = null

    #emit_validators = {}

    #trigger_props_changed = null

    #did_setup_provider = false
    
    #provided = {}

    #provided_with_ctx = null

    #refs_attachers = {}
    
    // ---

    // setup vue instance on constructor
    constructor(props, options, props_setup) {
        super(props)
        setCurrentInstance(this)

        if(__DEV__) {
            this.#watch_render_options.onTrack = this.emit_hook.bind(this, 'renderTracked')
            this.#watch_render_options.onTrigger = this.emit_hook.bind(this, 'renderTriggered')

            this.on_hook('renderTriggered', options.renderTriggered, true)
            this.on_hook('renderTracked', options.renderTracked, true)
        }

        // init vm instance
        this.#vm = {
            $data:        {},
            // $props:       {}, // auto addded by proxy instance
            $attrs:       {}, // toDo shallowReadonly
            $refs:        {},
            $slots:       props.$slots,
            $options:     options,
            $el:          null,
            $parent:      null, // ToDo
            $root:        null, // ToDo
            $emit:        this.$emit.bind(this),
            $forceUpdate: () => this.forceUpdate(),
            $nextTick:    (cb) => nextTick(cb.bind(this)),
            $watch:       this.$watch.bind(this),
        }

        this.$slots = this.#vm.$slots
        this.$attrs = this.#vm.$attrs

        const $captureError = this.emit_hook.bind(this, 'errorCaptured')
        Object.defineProperty(this.#vm, '$captureError', {
            get: () => $captureError,
        })

        // setup emit validators
        if(typeof(options.emits) == 'object' && !Array.isArray(options.emits)) {
            for(var name in options.emits) {
                if(typeof(options.emits[name]) == 'function') {
                    this.#emit_validators[camelize('on-' +name)] = options.emits[name].bind(this.#vm)
                }
            }
        }

        this.#trigger_props_changed = props_setup(this, this.#vm)

        // todo: $attrs should not contains props or events from emits key

        // init hooks
        this.on_hook('beforeCreate', options.beforeCreate, true)
        this.on_hook('created', options.created, true)
        this.on_hook('beforeMount', options.beforeMount, true)
        this.on_hook('mounted', options.mounted, true)
        this.on_hook('beforeUpdate', options.beforeUpdate, true)
        this.on_hook('updated', options.updated, true)
        this.on_hook('beforeUnmount', options.beforeUnmount, true)
        this.on_hook('unmounted', options.unmounted, true)
        this.on_hook('errorCaptured', options.errorCaptured, true)

        // call script setup function
        if(options.setup) {
            try {
                const setup_result = options.setup(this.#vm.$props, {
                    expose() {
                        // toDo
                    },
                    emit:  this.#vm.$emit,
                    slots: this.#vm.$slots,
                    attrs: this.#vm.$attrs,
                })

                if(typeof(setup_result) == 'function') {
                    this.#render = setup_result
                } else if(typeof(setup_result) == 'object') {
                    for(var key in setup_result) {
                        this.#vm[key] = setup_result[key]
                    }
                }
            } catch(e) {
                handleError(e, this.#vm, 'setup')
            }
        }

        if(!this.#render && typeof(options.render) == 'function')
            this.#render = options.render.bind(this.#vm)

        if(!this.#render)
            this.#render = () => null

        // init methods 
        if(options.methods) {
            for(var name in options.methods) {
                this.#vm[name] = options.methods[name].bind(this.#vm)
            }
        }

        // init directives 
        if(options.directives) {
            for(var name in options.directives) {
                this.directive(name, options.directives[name])
            }
        }

        // register components
        if(options.components) {
            for(var name in options.components) {
                this.component(name, options.components[name])
            }
        }

        // call beforeCreate hook
        this.emit_hook('beforeCreate')

        // attach injects
        for(var key in options.inject || {}) {
            var config = options.inject[key] || {}
            this.inject(key, config.default, true, config.from || key)
        }

        // attach data
        if(options.data) {
            this.#vm.$data = ref(options.data(this.#vm)).value
            attach(this.#vm.$data, this.#vm)
        }

        // attach computed variables
        for(var key in options.computed || {}) {
            var fn = options.computed[key]
            if(typeof(fn) == 'function')
                fn = fn.bind(this.#vm, this.#vm)

            if(typeof(fn.get) == 'function')
                fn.get = fn.get.bind(this.#vm, this.#vm)

            if(typeof(fn.set) == 'function')
                fn.set = fn.set.bind(this.#vm)

            const data = computed(fn)

            Object.defineProperty(this.#vm, key, {
                get: () => data.value,
                set: value => data.value = value
            })
        }

        // attach provide
        if(typeof(options.provide) == 'function')
            options.provide = options.provide.call(this.#vm)

        if(options.provide) {
            for(var key in options.provide) {
                this.provide(key, options.provide[key])
            }
        }

        this.#stylesheet = options.stylesheet || {}
        if(typeof(this.#stylesheet) == 'function') {
            const stylesheet = this.#stylesheet.bind(this.#vm)
            watchEffect(() => {
                const css_vars = this.#css_vars(this.#vm)
                this.#stylesheet = stylesheet(css_vars)
            })
        }

        // call created hook
        this.emit_hook('created')

        // setup watchers
        for(var key in options.watch || {}) {
            this.$watch(key, options.watch[key])
        }

        // call beforeMount hook
        this.emit_hook('beforeMount')
    }

    on_hook(name, cb, bind = false) {
        if(!cb)
            return

        if(Array.isArray(cb)) {
            for(var hook of cb) {
                this.on_hook(name, hook)
            }
            
            return
        }

        this.#hooks[name] = this.#hooks[name] || []
        if(bind)
            cb = cb.bind(this.#vm)

        this.#hooks[name].push(cb)
    }

    emit_hook(name, data) {
        var found = false 

        for(var cb of this.#hooks[name] || []) {
            found = true

            try {
                cb(data)
            } catch(e) {
                if(name == 'errorCaptured') {
                    throw(e)
                } else {
                    handleError(e, this.#vm, name)
                }
            }
        }

        return found
    }

    componentDidMount() {
        this.emit_hook('mounted')
    }

    componentDidUpdate() {
        this.emit_hook('updated')
    }

    shouldComponentUpdate(props) {
        if(props != this.props)
            this.#trigger_props_changed()

        return false
    }

    getSnapshotBeforeUpdate() {
        this.emit_hook('beforeUpdate')
        return null
    }

    componentWillUnmount() {
        this.emit_hook('beforeUnmount')
        this.emit_hook('unmounted')
    }

    render() {
        setCurrentInstance(this)
        var rendering = true

        try {
            watchEffect(() => {
                if(rendering === true) {
                    rendering = this.#render(this.#vm, this.#cache)
                    return
                }

                this.forceUpdate()
            }, this.#watch_render_options)
        } catch(e) {
            handleError(e, this.#vm, 'render')
        }

        return rendering
    }

    // ----------------- vue instance methods -----------------

    // Vue API
    provide(key, value) {
        // replace renderer to include react-native context provider
        if(!this.#did_setup_provider) {
            this.#did_setup_provider = true
            const render = this.#render

            this.#render = (vm, cache) => {
                if(!this.#provided_with_ctx) {
                    this.#provided_with_ctx = Object.create(this.context)
                    Object.assign(this.#provided_with_ctx, this.#provided)
                }

                return (<CompositionContext.Provider value={this.#provided_with_ctx}>{render(vm, cache)}</CompositionContext.Provider>)
            }
        }

        // register provided value
        this.#provided[key] = value
        return this
    }

    // Provide a value that can be injected in all descendent components within the application.
    inject(key, defaultValue, treatDefaultAsFactory = true, from = key) {
        Object.defineProperty(this.#vm, key, {
            get: () => {
                if(this.context[from] === undefined) {
                    if(typeof(defaultValue) == 'function' && treatDefaultAsFactory)
                        return defaultValue()

                    return defaultValue
                }

                return this.context[from]
            },
            set: (value) => this.context[from] = value
        })
    }

    $watch(source, value, options) {
        if(Array.isArray(value)) {
            for(var cb of value) {
                this.$watch(source, cb, options)
            }

            return this.#vm
        }

        if(typeof(value) == 'string')
            value = this.#vm[value]

        const fn = value
        value = () => {
            try {
                return fn()
            } catch(e) {
                handleError(e, this.#vm, 'watcher')
            }
        }

        $watch.call({
            _vm: this.#vm,
        }, source, value, options, setCurrentInstance, getCurrentInstance)

        return this.#vm
    }

    $emit(name, ...args) {
        name = camelize('on-' +name)
        if(this.#emit_validators[name] && !this.#emit_validators[name](...args)) {
            return this.#vm
        }

        if(typeof(this.props[name]) == 'function') {
            this.props[name](...args)
        } else if(Array.isArray(this.props[name])) {
            for(var cb of this.props[name]) {
                cb(...args)
            }
        }

        return this.#vm
    }

    component(name, component) {
        if(component) {
            const PascalName = capitalize(camelize(name))

            this.#components[name] = component
            this.#components[PascalName] = component
            this.#components[hyphenate(PascalName)] = component
            return this
        }

        return this.#components[name]
    }

    directive(name, directive) {
        if(directive) {
            const PascalName = capitalize(camelize(name))

            this.#directives[name] = directive
            this.#directives[PascalName] = directive
            this.#directives[hyphenate(PascalName)] = directive
            return this
        }

        return this.#directives[name]
    }

    useCssVars(vars) {
        this.#css_vars = vars.bind(this)
    }

    getClassStylesheet(name) {
        if(!name)
            return null

        var style = this.#stylesheet[name]
        if(style !== undefined)
            return style

        style = []

        const classes = name.split(' ')
        for(var name of classes) {
            if(name == '')
                continue

            const res = this.#stylesheet[name]
            if(res) {
                style.push(res)
            }
        }

        if(style.length === 0) {
            this.#stylesheet[name] = null
            return null
        }

        style = StyleSheet.flatten(style)
        this.#stylesheet[name] = style // cache mixed classes result for next usage
        return style
    }

    get version() {
        return version
    }

    _attachRef(name) {
        var attacher = this.#refs_attachers[name]
        if(!attacher) {
            if(name == '$el') {
                attacher = (el) => {
                    this.#vm.$el = el
                }
            } else {
                attacher = (el) => {
                    this.#vm.$refs[name] = el
                }
            }

            this.#refs_attachers[name] = attacher
        }
        
        
        return attacher
    }

    // ----------------- vue instance methods -----------------

    config = {}

    mount() {}

    unmount() {}

    use(plugin, options) {
        // toDo
    }

    mixin(mixin) {
        // toDo
    }
}

VueReactComponent.contextType = CompositionContext

// --------------------------------------------

import { View } from 'react-native'
import { objectToString } from "@vue/shared"

// transform options to react component
export function defineComponent(app) {
    if(app.$$typeof)
        return app

    var merged = false
    var props_setup = false
    var render = app.render

    class VueComponent extends VueReactComponent {
        constructor(props = {}) {
            if(render) {
                app = Object.create(app)
                app.render = render
            }

            super(props, app, props_setup)
        }
    }

    app.$$typeof = View.$$typeof
    app.render = function(props) {
        if(!merged) {
            merge(app, {}) // app.config.optionMergeStrategies ||
            merged = true

            props_setup = init_props(app.props)

            if(Array.isArray(app.inject)) {
                var old = app.inject
                app.inject = {}
                for(var key in old) {
                    app.inject[key] = {}
                }
            }
        }

        return <VueComponent { ...props} />
    }

    if(app.name) {
        VueComponent.displayName = app.name
    } else if(app.__name) {
        VueComponent.displayName = app.__name
    }

    return app
}

// create vue instance
export function createApp(options, props) {
    const component = defineComponent(options)
    return component.render(props)
}

export function onInstance(setter, getter) {
    setCurrentInstance = setter
    getCurrentInstance = getter
}

// --

function attach(data, target, readonly = false) {
    for(var key in data) {
        if(key.startsWith('$') || key.startsWith('_'))
            continue

        const k = key
        Object.defineProperty(target, key, {
            get: () => data[k],
            set: readonly ? () => {} : value => data[k] = value
        })
    }
}