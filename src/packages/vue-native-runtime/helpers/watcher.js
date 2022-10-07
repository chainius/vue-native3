
import { watch } from '@vue/runtime-core'

// this.$watch
export default function instanceWatch(source, value, options, setCurrentInstance, getCurrentInstance) {
    const publicThis = this._vm
    const getter = typeof(source) == 'string'
        ? source.includes('.')
            ? createPathGetter(publicThis, source)
            : () => publicThis[source]
        : source.bind(publicThis, publicThis)
    let cb
    if (typeof(value) == 'function') {
        cb = value
    } else {
        cb = value.handler
        options = value
    }

    const cur = getCurrentInstance()
    setCurrentInstance(this)
    const res = watch(getter, cb.bind(publicThis), options)
    if (cur) {
        setCurrentInstance(cur)
    } else {
        setCurrentInstance(null)
    }

    return res
}

function createPathGetter(ctx, path) {
    const segments = path.split('.')
    return () => {
        let cur = ctx
        for (let i = 0; i < segments.length && cur; i++) {
            cur = cur[segments[i]]
        }
        return cur
    }
}