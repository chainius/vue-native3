import React, { Component } from "react"
import { StyleSheet, View } from 'react-native'
import { watchEffect, ref, version, computed, nextTick, camelize, capitalize, hyphenate } from './runtime-bridge.js'
import { handleError } from './helpers/errors'
import merge from './helpers/merge-mixins'
import $watch from './helpers/watcher'
import setup_constructor from './component.features.js'

var setCurrentInstance = () => {}
var getCurrentInstance = () => {}

export const CompositionContext = React.createContext({})
CompositionContext.displayName = 'VueContext'

var $root = null // temporty workarround

// react component wrapper to vue component
class VueReactComponent extends Component {

    // private properties
    #components = {}

    #directives = {}

    #hooks = {}

    #cache = {}

    #vm = {}

    #exposed = {}

    #did_setup_provider = false
    
    #provided = {}

    #provided_with_ctx = null

    #refs_attachers = {}

    #helpers = {
        watch_render_options: {},
        emit_validators: {},
        trigger_props_changed: () => {},
        css_vars: () => ({}),
        stylesheet: {},
        known_props: {
            $parent:  true,
            $slots:   true,
            children: true,
        },
        render: null,
    }
    
    // ---

    // setup vue instance on constructor
    constructor(props, options, props_setup, setup) {
        super(props)
        setCurrentInstance(this)

        // init vm instance
        this.#vm = {
            $data:        {},
            // $props:       {}, // auto addded by proxy instance
            $refs:        {},
            $slots:       props.$slots,
            $options:     options,
            $el:          null,
            $parent:      props.$parent || null,
            $root:        $root,
            $emit:        this.$emit.bind(this),
            $forceUpdate: () => this.forceUpdate(),
            $nextTick:    (cb) => nextTick(cb.bind(this)),
            $watch:       this.$watch.bind(this),
        }

        this.#exposed = this.#vm
        this.$slots = this.#vm.$slots

        var expose_altered = false

        const expose = (obj = {}) => {
            if(!expose_altered) {
                expose_altered = true

                this.#exposed = {
                    get $attrs() {
                        return this.#vm.$attrs
                    },
                    get $props() {
                        return this.#vm.$props
                    },
                }

                function getter(name) {
                    return this.#vm[name]
                }

                for(var name in this.#vm) {
                    Object.defineProperty(this.#exposed, name, {
                        enumerable: true,
                        get: getter.bind(this.#vm, name),
                    })
                }

                for(var name of options.expose) {
                    Object.defineProperty(this.#exposed, name, {
                        enumerable: true,
                        get: getter.bind(this.#vm, name),
                    })
                }
            }

            for(var key in obj) {
                this.#exposed[key] = obj[key]
            }
        }

        // public exposed instance
        options.expose && expose()

        const $captureError = this.emit_hook.bind(this, 'errorCaptured')
        Object.defineProperty(this.#vm, '$captureError', {
            get: () => $captureError,
        })

        Object.defineProperty(this.#vm, '$attrs', {
            get: () => this.$attrs,
        })

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

        // init component options
        setup(this, this.#vm, this.#helpers, props, expose) // enable vue featurus on this component

        if(!this.#helpers.render)
            this.#helpers.render = () => (<View />)

        // call beforeMount hook
        this.emit_hook('beforeMount')

        $root = $root || this
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
        if(props != this.props) {
            delete this.#helpers.attrs
            this.#helpers.trigger_props_changed()
        }

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
                    rendering = this.#helpers.render(this.#vm, this.#cache)
                    return
                }

                this.forceUpdate()
            }, this.#helpers.watch_render_options)
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
            const render = this.#helpers.render

            this.#helpers.render = (vm, cache) => {
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
        if(this.#helpers.emit_validators[name] && !this.#helpers.emit_validators[name](...args)) {
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
        this.#helpers.css_vars = vars.bind(this)
    }

    getClassStylesheet(name) {
        if(!name)
            return null

        var style = this.#helpers.stylesheet[name]
        if(style !== undefined)
            return style

        style = []

        const classes = name.split(' ')
        for(var name of classes) {
            if(name == '')
                continue

            const res = this.#helpers.stylesheet[name]
            if(res) {
                style.push(res)
            }
        }

        if(style.length === 0) {
            this.#helpers.stylesheet[name] = null
            return null
        }

        style = StyleSheet.flatten(style)
        this.#helpers.stylesheet[name] = style // cache mixed classes result for next usage
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
                    this.#vm.$el = el && el._vm || el
                }
            } else {
                attacher = (el) => {
                    this.#vm.$refs[name] = el && el._vm || el
                }
            }

            this.#refs_attachers[name] = attacher
        }
        
        
        return attacher
    }

    get $attrs() {
        if(this.#helpers.attrs)
            return this.#helpers.attrs

        var attrs = {}
        for(var key in this.props) {
            if(this.#helpers.known_props[key])
                continue

            attrs[key] = this.props[key]
        }

        this.#helpers.attrs = attrs
        return attrs
    }

    get inheritAttrs() {
        return !(this.#vm.$options.inheritAttrs === false)
    }

    get _vm() {
        return this.#exposed
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
VueReactComponent.$slots = true

// --------------------------------------------

// transform options to react component
export function defineComponent(app) {
    if(app.$$typeof)
        return app

    var merged = false
    var props_setup = false
    var render = app.render
    var setup = null

    class VueComponent extends VueReactComponent {
        constructor(props = {}) {
            if(render) {
                app = Object.create(app)
                app.render = render
            }

            super(props, app, props_setup, setup)
        }
    }

    app.$$typeof = View.$$typeof
    app.render = function(props) {
        if(!merged) {
            merge(app, {}) // app.config.optionMergeStrategies ||
            merged = true

            setup = setup_constructor(app, render)
        }

        return <VueComponent { ...props} />
    }

    app.render.$slots = true

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
