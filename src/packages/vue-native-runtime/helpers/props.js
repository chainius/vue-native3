const { customRef } = require('@vue/runtime-core')
const shared = require('@vue/shared')

export default function init(config) {
    if(!config)
        return () => () => {}

    // convert array props to object
    if(Array.isArray(config)) {
        var sub = config
        config = {}
        for(var item of sub) {
            config[item] = {}
        }
    } else {
        // convert object props to object
        var sub = config
        config = {}

        for(var key in sub) {
            config[key] = sub[key] || {}
            if(typeof(config[key]) == 'function') {
                config[key] = { type: config[key] }
            }
        }
    }

    function setupConfig(name, conf) {
        var precheck = () => {}

        // add validators in dev mode
        if(__DEV__) {
            precheck = function(vm, props) {
                if(conf.required && typeof(props[name]) === "undefined") {
                    console.warn(`[VueJS] Missing required prop: ${name}`)
                    return
                } else if(typeof(props[name]) === "undefined") {
                    return
                }

                var expected = assertTypes(props[name], conf.type)
                if(expected !== true) {
                    console.warn(`[VueJS] Invalid prop: type check failed for prop "${name}". Expected ${expected.join(' or ')}, got ${typeof(props[name])}.`)
                } else if(conf.validator && !conf.validator(props[name])) {
                    console.warn(`[VueJS] Invalid prop: custom validator check failed for prop "${name}".`)
                }
            }
        }

        // add direct getter
        config[name] = function(track, props) {
            props = this.instance?.props || props

            track()
            __DEV__ && precheck(this, props)

            if(typeof(props[name]) === "undefined" && conf.default) {
                if(typeof(conf.default) == 'function')
                    return conf.default(props)

                return conf.default
            }

            return props[name]
        }
    }

    // Setup getters
    for(var key in config) {
        if (key[0] === '$') {
            console.warn(`Invalid prop name: "${key}" is a reserved property.`)
            continue
        }

        setupConfig(key, config[key])
    }

    // create instance setup function
    return function(vm, component, _props) {
        var props = {}

        var props_trigger = null
        var props_tracker = null

        customRef((track, trigger) => {
            props_trigger = trigger
            props_tracker = track
            return {}
        })

        for(var key in config) {
            const fn = config[key].bind(vm, props_tracker, _props)
            Object.defineProperty(props, key, { get: fn })
            Object.defineProperty(vm, key, { get: fn })
        }

        component.$props = props
        return props_trigger
    }
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Taken from VueJS library since those functions are not exported:

const isSimpleType = /*#__PURE__*/ shared.makeMap('String,Number,Boolean,Function,Symbol,BigInt')

function getType(ctor) {
    const match = ctor && ctor.toString().match(/^\s*function (\w+)/)
    return match ? match[1] : ctor === null ? 'null' : ''
}

/**
 * dev only
 */
function assertType(value, type) {
    let valid
    const expectedType = getType(type)
    if (isSimpleType(expectedType)) {
        const t = typeof value
        valid = t === expectedType.toLowerCase()
        // for primitive wrapper objects
        if (!valid && t === 'object') {
            valid = value instanceof type
        }
    } else if (expectedType === 'Object') {
        valid = shared.isObject(value)
    } else if (expectedType === 'Array') {
        valid = shared.isArray(value)
    } else if (expectedType === 'null') {
        valid = value === null
    } else {
        valid = value instanceof type
    }

    return {
        valid,
        expectedType
    }
}

function assertTypes(value, type) {
    if(!type || type.length == 0)
        return true

    const types = shared.isArray(type) ? type : [type]
    const expectedTypes = []

    // value is valid as long as one of the specified types match
    for (let i = 0; i < types.length; i++) {
        const { valid, expectedType } = assertType(value, types[i])
        expectedTypes.push(expectedType || '')
        if(valid) {
            return true
        }
    }

    return expectedTypes
}

// ----------------------------------------------------------------------

// const { watchSyncEffect } = require('@vue/runtime-core')
// global.__DEV__ = true

// const setup = init({
//     test: {
//         type:     String,
//         required: true
//     },
//     test2: {
//         type:     String,
//     }
// })

// const instance = {
//     props: {
//         test:  'vvs',
//         // test2: 'x'
//     }
// }

// const vm = {}

// var trigger = setup(instance, vm)

// watchSyncEffect(() => {
//     console.log('got $props', vm.$props.test)
// })


// instance.props.test = 'hello'
// trigger()
