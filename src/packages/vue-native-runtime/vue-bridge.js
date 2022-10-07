export {
    toDisplayString,
    camelize,
    capitalize,
    toHandlerKey,
    normalizeProps,
    normalizeClass,
    normalizeStyle,
    hyphenate,
} from '@vue/shared'

export {
    ReactiveEffect,
    customRef,
    effect,
    effectScope,
    getCurrentScope,
    isProxy,
    isReactive,
    isReadonly,
    isRef,
    isShallow,
    markRaw,
    onScopeDispose,
    proxyRefs,
    reactive,
    readonly,
    ref,
    shallowReactive,
    shallowReadonly,
    shallowRef,
    stop,
    toRaw,
    toRef,
    toRefs,
    triggerRef,
    unref,
    computed,
} from '@vue/reactivity'

export {
    version,
    warn,
    watch,
    watchEffect,
    watchPostEffect,
    watchSyncEffect,
    nextTick,
    mergeProps,
    defineProps, // empty fn
    defineEmits, // empty fn
    defineExpose, // empty fn
    withDefaults, // empty fn
    guardReactiveProps,
    compatUtils,
    createRenderer,
    ssrUtils,
    ssrContextKey,
    mergeDefaults,
    isRuntimeOnly,
    toHandlers,
    isMemoSame,
} from '@vue/runtime-core'

// ------------------------------------------------------------
// from dom package:

const modifierGuards = {
    stop:    e => e.stopPropagation(),
    prevent: e => e.preventDefault(),
    self:    e => e.target !== e.currentTarget,
    ctrl:    e => !e.ctrlKey,
    shift:   e => !e.shiftKey,
    alt:     e => !e.altKey,
    meta:    e => !e.metaKey,
    left:    e => 'button' in e && e.button !== 0,
    middle:  e => 'button' in e && e.button !== 1,
    right:   e => 'button' in e && e.button !== 2,
    exact:   () => false
}
/**
 * @private
 */
export function withModifiers(fn, modifiers) {
    return (event, ...args) => {
        for (let i = 0; i < modifiers.length; i++) {
            const guard = modifierGuards[modifiers[i]]
            if (guard && guard(event, modifiers))
                return
        }
        return fn(event, ...args)
    }
}