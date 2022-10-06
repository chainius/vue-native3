import { handleError } from './helpers/errors'
import { watchEffect, camelize, ref, computed } from './runtime-bridge.js'
import init_props from './helpers/props'

// enable renderTriggered & renderTracked features
export function withRenderOptions(options) {
    return function(vm, helpers) {
        helpers.watch_render_options.onTrack = this.emit_hook.bind(this, 'renderTracked')
        helpers.watch_render_options.onTrigger = this.emit_hook.bind(this, 'renderTriggered')

        this.on_hook('renderTriggered', options.renderTriggered, true)
        this.on_hook('renderTracked', options.renderTracked, true)
    }
}

// enable emit options
export function withEmits(options) {
    // setup emit validators
    if(typeof(options.emits) != 'object')
        return

    var has_data = false
    var res = {}
    var additional = []

    if(Array.isArray(options.emits)) {
        additional = options.emits.map((name) => camelize('on-' +name))
    } else {

        for(var name in options.emits) {
            var subName = camelize('on-' +name)
            if(typeof(options.emits[name]) == 'function') {
                has_data = true
                res[subName] = options.emits[name]
            } else {
                additional.push(subName)
            }
        }

    }

    if(!has_data && additional.length == 0)
        return

    // return constructor
    return function(vm, helpers) {
        for(var name of additional) {
            helpers.known_props[name] = true
        }

        for(var name in res) {
            helpers.known_props[name] = true
            helpers.emit_validators[name] = res[name].bind(vm)
        }
    }
}

// enable props definitions
export function withProps(options) {
    if(!options.props)
        return

    props_setup = init_props(options.props)
    return function(vm, helpers) {
        for(var prop in options.props) {
            helpers.known_props[prop] = true
        }

        helpers.trigger_props_changed = props_setup(this, vm)
    }
}

export function withDirectives(options) {
    if(!options.directives)
        return

    return function() {
        for(var name in options.directives) {
            this.directive(name, options.directives[name])
        }
    }
}

export function withComponents(options) {
    if(!options.components)
        return

    return function() {
        for(var name in options.components) {
            this.component(name, options.components[name])
        }
    }
}

export function withMethods(options) {
    if(!options.methods)
        return

    return function(vm) {
        for(var name in options.methods) {
            vm[name] = options.methods[name].bind(vm)
        }
    }
}

export function withInject(options) {
    if(!options.inject)
        return

    var hasKeys = false
    if(Array.isArray(options.inject)) {
        var old = options.inject
        options.inject = {}
        for(var key in old) {
            hasKeys = true
            options.inject[key] = {
                from: key,
            }
        }
    } else {
        for(var key in options.inject) {
            hasKeys = true
            options.inject[key] = options.inject[key] || {}
            options.inject[key].from = options.inject[key].from || key
        }
    }

    if(!hasKeys)
        return

    return function() {
        for(var key in options.inject) {
            var config = options.inject[key]
            this.inject(key, config.default, true, config.from)
        }
    }
}

export function withProvide(options) {
    if(!options.provide)
        return

    return function(vm) {
        var provide = options.provide
        if(typeof(provide) == 'function')
            provide = provide.call(vm)

        for(var key in provide) {
            this.provide(key, provide[key])
        }
    }
}

export function withStylesheet(options) {
    if(!options.stylesheet)
        return

    if(typeof(options.stylesheet) == 'function') {
        return function(vm, helpers) {
            const stylesheet = options.stylesheet.bind(vm)

            watchEffect(() => {
                const css_vars = helpers.css_vars(vm)
                helpers.stylesheet = stylesheet(css_vars)
            })
        }
    }

    return function(vm, helpers) {
        helpers.stylesheet = options.stylesheet
    }
}

export function withSetup(options) {
    if(!options.setup) {
        return () => {}
    }

    // call script setup function
    return function(vm, helpers, props, expose) {
        const finaliser = (setup_result) => {
            if(typeof(setup_result) == 'function') {
                helpers.render = setup_result.bind(vm)
            } else if(typeof(setup_result) == 'object') {
                for(var key in setup_result) {
                    vm[key] = setup_result[key]
                }
            }
        }

        try {
            const setup_result = options.setup(vm.$props, {
                expose: expose,
                emit:   vm.$emit,
                slots:  vm.$slots,
                attrs:  vm.$attrs,
            })

            if(setup_result && setup_result.then)
                return setup_result.then(finaliser)

            finaliser(setup_result)
        } catch(e) {
            handleError(e, vm, 'setup')
        }
    }
}

export function withRender(options, render) {
    if(!render) {
        return
    }

    return function(vm, helpers) {
        helpers.render = helpers.render || render.bind(vm)
    }
}

export function withEmit(name) {
    return function() {
        return function() {
            this.emit_hook(name)
        }
    }
}

export function withData(options) {
    if(!options.data)
        return

    return function(vm) {
        vm.$data = ref(options.data.call(vm, vm)).value
        attach(vm.$data, vm)
    }
}

export function withComputed(options) {
    if(!options.computed)
        return

    return function(vm) {
        for(var key in options.computed) {
            var fn = options.computed[key]
            if(typeof(fn) == 'function')
                fn = fn.bind(vm, vm)

            if(typeof(fn.get) == 'function')
                fn.get = fn.get.bind(vm, vm)

            if(typeof(fn.set) == 'function')
                fn.set = fn.set.bind(vm)

            const data = computed(fn)

            Object.defineProperty(vm, key, {
                get: () => data.value,
                set: value => data.value = value
            })
        }
    }
}

export function withWatch(options) {
    if(!options.watch)
        return

    return function() {
        // setup watchers
        for(var key in options.watch) {
            this.$watch(key, options.watch[key])
        }        
    }
}

// creates otpmized component constructor
export function createChain(options, render) {
    var fns = []

    for (let i = 2; i < arguments.length; i++) {
        const res = arguments[i] && arguments[i](options, render)
        if(typeof(res) == 'function') {
            fns.push(res)
        }
    }

    return function(embeded, props, expose) {
        for(var e of fns) {
            e.call(embeded, embeded.vm, embeded.helpers, props, expose)
        }
    }
}

export default function setup(options, render) {
    // 16 directives
    const pre = createChain(
        options,
        render,
        __DEV__ && withRenderOptions,
        withEmits,
        withProps,
    )

    const post = createChain(
        withRender,
        withMethods,
        withDirectives,
        withComponents,
        withEmit('beforeCreate'),
        withInject,
        withData,
        withComputed,
        withProvide,
        withStylesheet,
        withEmit('created'),
        withWatch,
    )

    return [
        pre,
        withSetup(options),
        post,
    ]
}

// attach data
export function attach(data, target, readonly = false) {
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