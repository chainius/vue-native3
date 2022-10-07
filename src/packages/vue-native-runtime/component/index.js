import React, { Component } from "react"
import { attachApp, GlobalContext, CompositionContext } from '../app.js'
import merge from '../helpers/merge-mixins'
import setup_constructor from './features.js'
import VM from './vm.js'

var setCurrentInstance = () => {}

// react component wrapper to vue component
class VueReactComponent extends Component {
    #vm = null

    constructor(props, vm) {
        super(props)
        this.#vm = vm
        vm.forceUpdate = this.forceUpdate.bind(this)

        if(!vm.helpers.render)
            vm.helpers.render = () => null

        vm.emit_hook('beforeMount')
    }

    componentDidMount() {
        this.#vm.emit_hook('mounted')
    }

    componentDidUpdate() {
        this.#vm.emit_hook('updated')
    }

    getSnapshotBeforeUpdate() {
        this.#vm.emit_hook('beforeUpdate')
        return null
    }

    componentWillUnmount() {
        this.#vm.emit_hook('beforeUnmount')
        this.#vm.emit_hook('unmounted')
    }

    componentDidCatch(error, errorInfo) {
        this.#vm.$captureError(error, this.#vm, errorInfo)
    }

    shouldComponentUpdate(props) {
        if(props != this.props) {
            delete this.#vm.helpers.attrs
            this.#vm.helpers.trigger_props_changed()
        }

        return false
    }

    render() {
        return this.#vm.render()
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
    var setup = null
    var global_config = null

    // integrate mixins & generate setup function
    function getSetup() {
        if(!merged) {
            // global_config = initGlobalConfig()

            app.mixins = app.mixins || []
            app.mixins = global_config.mixins.concat(app.mixins)

            merge(app, global_config.config.optionMergeStrategies)
            merged = true

            setup = setup_constructor(app, app.render)
        }

        return setup
    }

    // generates React Component Class with a vm generator
    function generateComponent(genVM) {
        class VueComponent extends VueReactComponent {
            constructor(props = {}) {
                global_config = GlobalContext // ToDo use react context
                super(props, genVM(props))
            }
        }

        VueComponent.$slots = true

        if(app.name) {
            VueComponent.displayName = app.name
        } else if(app.__name) {
            VueComponent.displayName = app.__name
        }

        return VueComponent
    }

    // generate async component
    if(app.async) {
        return {
            $$typeof: Symbol.for('react.lazy'),
            _init(payload, suspensible = false, props = {}) {
                global_config = GlobalContext // ToDo use react context
                const [pre, setup, post] = getSetup()

                const vm = new VM( global_config, app, props )
                pre(vm, props)

                throw((async function() {
                    setCurrentInstance(vm)
                    await setup(vm, vm.helpers, props, vm.expose)
                    post(vm, props)

                    const VueComponent = generateComponent(() => vm)

                    return function sync_render(props) {
                        return <VueComponent {...props} />
                    }
                })())
            },
            _payload: {
                _status: -1,
            },
        }
    }

    // generate sync component
    return generateComponent(function(props) {
        const [pre, setup, post] = getSetup()
        const vm = new VM( global_config, app, props )

        pre(vm, props)
        setCurrentInstance(vm)
        setup(vm, vm.helpers, props, vm.expose)
        post(vm, props)

        return vm
    })
}

// create vue instance
export function createApp(options, props) {
    const app = typeof(options) == 'function' ? options : defineComponent(options)
    return attachApp(app, props)
}

export function onInstance(setter, getter) {
    setCurrentInstance = setter
    VM.onInstance(setter, getter)
}
