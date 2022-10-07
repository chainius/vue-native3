import React from "react"
import { StyleSheet } from 'react-native'
import { watchEffect, version, nextTick, camelize, capitalize, hyphenate } from '../vue-bridge.js'
import { handleError } from '../helpers/errors'
import { CompositionContext } from '../app.js'
import $watch from '../helpers/watcher'
import { attach } from './features.js'

class VM {

    helpers = {
        watch_render_options:  {},
        emit_validators:       {},
        trigger_props_changed: () => {},
        css_vars:              () => ({}),
        stylesheet:            {},
        known_props:           {
            $parent:  true,
            $slots:   true,
            children: true,
        },
        render: null,
    }

    vm = {}

    #components = {}

    #directives = {}

    #cache = {}

    #hooks = {}

    #stop_effect = () => null

    #global_config = {}

    #refs_attachers = {}

    #exposed = {}

    #did_setup_provider = false

    #provided = {}

    #provided_with_ctx = null

    // setup VM instance
    constructor(global_config, options, props) {
        this.#global_config = global_config

        // init vm instance
        this.vm = {
            $data:        {},
            // $props // auto addded by proxy instance
            // $root  // auto addded by proxy instance
            // $attrs // auto added
            $refs:        {},
            $slots:       props.$slots || {},
            $options:     options,
            $el:          null,
            $parent:      props.$parent || null,
            $emit:        this.$emit.bind(this),
            $forceUpdate: () => this.forceUpdate(),
            $nextTick:    (cb) => nextTick(cb.bind(this)),
            $watch:       this.$watch.bind(this),
        }

        Object.defineProperty(this.vm, '$attrs', {
            enumerable: true,
            get:        () => this.$attrs,
        })


        Object.defineProperty(this.vm, '$root', {
            enumerable: true,
            get:        () => global_config.$root,
        })

        this.vm.$captureError = this.$captureError.bind(this)

        this.#exposed = this.vm
        this.$slots = this.vm.$slots

        var expose_altered = false

        const expose = (obj = {}) => {
            if(!expose_altered) {
                expose_altered = true

                this.#exposed = {
                    get $props() {
                        return this.vm.$props
                    },
                }

                function getter(name) {
                    return this.vm[name]
                }

                for(var name in this.vm) {
                    Object.defineProperty(this.#exposed, name, {
                        enumerable: true,
                        get:        getter.bind(this.vm, name),
                    })
                }

                for(var name of options.expose || []) {
                    Object.defineProperty(this.#exposed, name, {
                        enumerable: true,
                        get:        getter.bind(this.vm, name),
                    })
                }
            }

            for(var key in obj) {
                this.#exposed[key] = obj[key]
            }
        }

        // public exposed instance
        options.expose && expose()
        this.expose = expose

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
        this.on_hook('activated', options.activated, true)
        this.on_hook('deactivated', options.deactivated, true)

        // init component options
        attach(global_config.config.globalProperties, this.vm)
    }

    // --------------------------------------------

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
            cb = cb.bind(this.vm)

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
                    handleError(e, this.vm, name)
                }
            }
        }

        return found
    }

    _attachRef(name) {
        var attacher = this.#refs_attachers[name]
        if(!attacher) {
            if(name == '$el') {
                attacher = (el) => {
                    this.vm.$el = el && el._vm || el
                }
            } else {
                attacher = (el) => {
                    this.vm.$refs[name] = el && el._vm || el
                }
            }

            this.#refs_attachers[name] = attacher
        }

        return attacher
    }

    useCssVars(vars) {
        this.helpers.css_vars = vars.bind(this)
    }

    getClassStylesheet(name) {
        if(!name)
            return null

        var style = this.helpers.stylesheet[name]
        if(style !== undefined)
            return style

        style = []

        const classes = name.split(' ')
        for(var name of classes) {
            if(name == '')
                continue

            const res = this.helpers.stylesheet[name]
            if(res) {
                style.push(res)
            }
        }

        if(style.length === 0) {
            this.helpers.stylesheet[name] = null
            return null
        }

        style = StyleSheet.flatten(style)
        this.helpers.stylesheet[name] = style // cache mixed classes result for next usage
        return style
    }

    $captureError(e, instance, type) {
        if(this.emit_hook('errorCaptured', e, instance, type))
            return true

        if(this.#global_config.config.errorHandler) {
            this.#global_config.config.errorHandler(e, instance, type)
            return true
        }
    }

    // ----------------- vue instance methods -----------------

    component(name, component) {
        if(component) {
            const PascalName = capitalize(camelize(name))
            // component.displayName = component.displayName || name

            this.#components[name] = component
            this.#components[PascalName] = component
            this.#components[hyphenate(PascalName)] = component
            return this
        }

        return this.#components[name] || this.#global_config.components[name]
    }

    directive(name, directive) {
        if(directive) {
            const PascalName = capitalize(camelize(name))

            this.#directives[name] = directive
            this.#directives[PascalName] = directive
            this.#directives[hyphenate(PascalName)] = directive
            return this
        }

        return this.#directives[name] || this.#global_config.directives[name]
    }

    provide(key, value) {
        // replace renderer to include react-native context provider
        if(!this.#did_setup_provider) {
            this.#did_setup_provider = true
            const render = this.helpers.render

            this.helpers.render = (vm, cache) => {
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
        Object.defineProperty(this.vm, key, {
            get: () => {
                const res = this.context[from] === undefined ? this.#global_config.provides[from] : this.context[from]

                if(res === undefined) {
                    if(typeof(defaultValue) == 'function' && treatDefaultAsFactory)
                        return defaultValue()

                    return defaultValue
                }

                return res
            },
            set: (value) => {
                if(this.context[from] !== undefined) {
                    this.context[from] = value
                } else if(this.#global_config.provides[from] !== undefined) {
                    this.#global_config.provides[from] = value
                }
            }
        })
    }

    $watch(source, value, options) {
        if(Array.isArray(value)) {
            for(var cb of value) {
                this.$watch(source, cb, options)
            }

            return this.vm
        }

        if(typeof(value) == 'string')
            value = this.vm[value]

        const fn = value
        value = () => {
            try {
                return fn()
            } catch(e) {
                handleError(e, this.vm, 'watcher')
            }
        }

        $watch.call({
            _vm: this.vm,
        }, source, value, options, setCurrentInstance, getCurrentInstance)

        return this.vm
    }

    $emit(name, ...args) {
        name = camelize('on-' +name)
        if(this.helpers.emit_validators[name] && !this.helpers.emit_validators[name](...args)) {
            return this.vm
        }

        if(typeof(this.props[name]) == 'function') {
            this.props[name](...args)
        } else if(Array.isArray(this.props[name])) {
            for(var cb of this.props[name]) {
                cb(...args)
            }
        }

        return this.vm
    }

    get version() {
        return version
    }

    get $attrs() {
        if(this.helpers.attrs)
            return this.helpers.attrs

        var attrs = {}
        for(var key in this.props) {
            if(this.helpers.known_props[key])
                continue

            attrs[key] = this.props[key]
        }

        this.helpers.attrs = attrs
        return attrs
    }

    get inheritAttrs() {
        return !(this.vm.$options.inheritAttrs === false)
    }

    get proxy() {
        return this.#exposed
    }

    // --------------------------------------------

    forceUpdate() {}

    render() {
        setCurrentInstance(this, true)
        var rendering = true

        try {
            this.#stop_effect()

            this.#stop_effect = watchEffect(() => {
                if(rendering === true) {
                    rendering = this.helpers.render(this.vm, this.#cache)
                    return
                }

                this.forceUpdate()
            }, this.helpers.watch_render_options)
        } catch(e) {
            handleError(e, this.vm, 'render')
        }

        return rendering
    }
}

module.exports = VM

var setCurrentInstance = () => {}
var getCurrentInstance = () => {}

VM.onInstance = (setter, getter) => {
    setCurrentInstance = setter
    getCurrentInstance = getter
}
