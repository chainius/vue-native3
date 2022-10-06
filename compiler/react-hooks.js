import { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from 'react';
import { reactive } from '@vue/reactivity'

var ids = 0

function wrapHooks(instance) {
    var id = ids++
    var states = []
    var state_index = 0
    var is_initial = true
    var isUpdating = false
    var cleanup = []

    function update() {
        if(isUpdating)
            return

        isUpdating = true
        setImmediate(() => {
            isUpdating = false
            instance.forceUpdate()
        })
    }

    return {

        useContext() {
            console.log('useContext')
        },

        useState(state) {
            if(is_initial) {
                if(typeof(state) == 'function')
                    state = state()

                var i = states.length
                states.push([
                    state,
                    (n) => {
                        if(n == states[i])
                            return
    
                        states[i][0] = n
                        update()
                    }
                ])
            }

            var index = state_index
            state_index++

            return states[index]
        },

        useReducer() {
            console.log('useReducer')
        },

        useRef() {
            console.log('useRef')
        },

        useEffect(e) {
            const clr = e()
            if(typeof(clr) == 'function')
                cleanup.push(clr)
        },

        useInsertionEffect() {
            console.log('useInsertionEffect')
        },

        useLayoutEffect() {
            console.log('useLayoutEffect')
        },

        useCallback() {
            console.log('useCallback')
        },

        useMemo() {
            console.log('useMemo')
        },

        useImperativeHandle() {
            console.log('useImperativeHandle')
        },

        useDebugValue() {
            console.log('useDebugValue')
        },

        useTransition() {
            console.log('useTransition')
        },

        useDeferredValue() {
            console.log('useDeferredValue')
        },

        useId() {
            return id
        },

        useSyncExternalStore() {
            console.log('useSyncExternalStore')
        },

        boforeRendering() {
            for(var cb of cleanup) {
                cb()
            }

            cleanup = []
            state_index = 0
        },

        onRenderingDone() {
            is_initial = false
        }
    }
}

function withHooksRenderer(renderer, hooks) {
    return function() {
        const prev = __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current
        __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = hooks
        
        hooks.boforeRendering()
        const res = renderer()
        hooks.onRenderingDone()

        __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prev

        if(typeof(res) !== 'object')
            return {}

        return res
    }
}

// enable hooks on vue setup, all the hooks should be called inside the render function
export function enableHooks(instance, renderer) {
    renderer = withHooksRenderer(renderer, wrapHooks(instance))

    var state = reactive(renderer())
    var is_initial = true

    // override instance renderer fn
    const render = instance.render
    instance.render = function() {
        if(!is_initial) {
            Object.assign(state, renderer())
        }

        is_initial = false
        return render.call(this)
    }

    return state
}