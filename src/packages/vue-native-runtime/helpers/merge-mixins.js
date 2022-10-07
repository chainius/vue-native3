var shared = require('@vue/shared')

const internalOptionMergeStrats = {
    data:           mergeDataFn,
    props:          mergeObjectOptions,
    emits:          mergeObjectOptions,
    // objects
    methods:        mergeObjectOptions,
    computed:       mergeObjectOptions,
    // lifecycle
    beforeCreate:   mergeAsArray,
    created:        mergeAsArray,
    beforeMount:    mergeAsArray,
    mounted:        mergeAsArray,
    beforeUpdate:   mergeAsArray,
    updated:        mergeAsArray,
    beforeDestroy:  mergeAsArray,
    beforeUnmount:  mergeAsArray,
    destroyed:      mergeAsArray,
    unmounted:      mergeAsArray,
    activated:      mergeAsArray,
    deactivated:    mergeAsArray,
    errorCaptured:  mergeAsArray,
    serverPrefetch: mergeAsArray,
    // assets
    components:     mergeObjectOptions,
    directives:     mergeObjectOptions,
    // watch
    watch:          mergeWatchOptions,
    // provide / inject
    provide:        mergeDataFn,
    inject:         mergeInject
}

function mergeDataFn(to, from) {
    if (!from) {
        return to
    }

    if (!to) {
        return from
    }

    return function mergedDataFn() {
        return (shared.extend)(shared.isFunction(to) ? to.call(this, this) : to, shared.isFunction(from) ? from.call(this, this) : from)
    }
}

function mergeInject(to, from) {
    return mergeObjectOptions(normalizeInject(to), normalizeInject(from))
}

function mergeAsArray(to, from) {
    return to ? [...new Set([].concat(to, from))] : from
}

function mergeObjectOptions(to, from) {
    return to ? shared.extend(shared.extend(Object.create(null), to), from) : from
}

function mergeWatchOptions(to, from) {
    if (!to)
        return from

    if (!from)
        return to

    const merged = shared.extend(Object.create(null), to)
    for (const key in from) {
        merged[key] = mergeAsArray(to[key], from[key])
    }
    return merged
}

function mergeOptions(to, from, strats, asMixin = false) {
    const { mixins, extends: extendsOptions } = from
    if (extendsOptions) {
        mergeOptions(to, extendsOptions, strats, true)
    }

    if (mixins) {
        mixins.forEach((m) => mergeOptions(to, m, strats, true))
    }

    for (const key in from) {
        if (asMixin && key === 'expose') {
            console.warn(`"expose" option is ignored when declared in mixins or extends. ` +
                    `It should only be declared in the base component itself.`)
        } else {
            const strat = internalOptionMergeStrats[key] || (strats && strats[key])
            to[key] = strat ? strat(to[key], from[key]) : from[key]
        }
    }

    return to
}

/**
 * Resolve merged options and cache it on the component.
 * This is done only once per-component since the merging does not involve
 * instances.
 */
export default function resolveOptions(instance, strats = {}) {
    if(!instance.mixins)
        return instance

    for(var mixin of instance.mixins) {
        mergeOptions(instance, mixin, strats)
    }

    return instance
}