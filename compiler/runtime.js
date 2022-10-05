export * from './runtime-bridge.js'
export * from './buildin'
import React from 'react'
import { Button, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { isMemoSame, mergeProps } from './runtime-bridge.js'

/**
 * mark the current rendering instance for asset resolution (e.g.
 * resolveComponent, resolveDirective) during render
 */
import { onInstance } from './component.js'
let currentRenderingInstance = null
var blockOpened = false

onInstance((instance, opening = false) => {
    currentRenderingInstance = instance
    blockOpened = opening
}, () => currentRenderingInstance)

export function getCurrentInstance() {
    return currentRenderingInstance
}

// ----

export function setBlockTracking() {}

export function openBlock() {
    return null
}

export function createCommentVNode() {
    return null
}

export function h(T, props = {}, children = null) {
    if(typeof(T) == 'string')
        T = resolveComponent(T)

    if((typeof(props) != 'object' || Array.isArray(props)) && children == null) {
        children = props
        props = {}
    }

    return <T { ...props }>{children}</T>
}

function render(T, props, children, patchFlag, dynamicProps) {
    if(!T)
        return null

    props = props || {}
    props.style = props.style || {}

    if(props.class && currentRenderingInstance) {
        props.style = StyleSheet.flatten([
            currentRenderingInstance.getClassStylesheet(props.class),
            props.style
        ])
    }

    if(props.ref && currentRenderingInstance) {
        props.ref = currentRenderingInstance._attachRef(props.ref)
    }

    // attach childrens
    if(T.render && T.render.$slots || T.$slots) {
        props.$slots = children
    } else {
        children = children && children.default || children || null

        if(typeof(children) == 'function') {
            children = children(props)
        }
    }

    if(!Array.isArray(children)) {
        children = [ children ]
    }

    return React.createElement(
        T,
        props,
        ...children,
    )
} 

function renderWithParent(T, props, children, patchFlag, dynamicProps) {
    if(currentRenderingInstance) {
        props = props || {}
        props.$parent = currentRenderingInstance._vm
    }

    return render(T, props, children, patchFlag, dynamicProps)
}

export const createVNode = renderWithParent // from inner elements
export const createElementVNode = renderWithParent

export const Fragment = '__Fragment__'

// from template root element
export const createBlock = (T, props, children, patchFlag, dynamicProps) => {
    props = props || {}


    if(blockOpened) {
        blockOpened = false
        if(typeof(T) != 'function') {
            props.ref = '$el'
        }

        if(currentRenderingInstance && currentRenderingInstance.inheritAttrs) {
            props = mergeProps(props, currentRenderingInstance.$attrs)
        }
    } else if(currentRenderingInstance) {
        props.$parent = currentRenderingInstance._vm
    }

    return render(T, props, children, patchFlag, dynamicProps)
}

// used with directives
export const createElementBlock = (T, props, children, patchFlag, dynamicProps) => {
    if(T == Fragment)
        return children || null

    return renderWithParent(T, props, children, patchFlag, dynamicProps)
}

// ---

export function renderList(items, cb) {
    const res = []

    if(typeof(items) == 'number') {
        for(var i=0; i<items;i++)
            res.push(cb(i))
    } else {
        for(var i in items)
            res.push(cb(items[i], i))
    }

    return res
}

export function renderSlot(slots, name, props = {}, fallback, noSlotted) {
    var item = slots[name] || fallback
    if(typeof(item) == 'function')
        item = item(props)

    if(!item)
        return null

    if(Array.isArray(item))
        return React.createElement(React.Fragment, {}, ...item)

    return item
}

import DirectiveComponent from './directives.js'

export function withDirectives(node, directives) {
    node = Object.freeze(Object.assign({
        style: node.props.style,
    }, node))

    return <DirectiveComponent node={node} directives={directives} instance={currentRenderingInstance} />
}

export function vModelText() {}

export function withCtx(cb) {
    return cb
}

export function createTextVNode(txt) {
    return txt
}

// ----

import { KeepAlive, Suspense } from './buildin'

const components = {
    view:          View,
    button:        Button,
    text:          Text,
    touchable:     TouchableOpacity,
    'keep-alive':  KeepAlive,
    KeepAlive:     KeepAlive,
    suspense:      Suspense,
    Suspense:      Suspense,
}

export function resolveComponent(name) {
    const item = currentRenderingInstance && currentRenderingInstance.component(name) || components[name] || null
    __DEV__ && !item && console.warn(`Component ${name} not found`)
    return item
}

export function resolveDynamicComponent(name) {
    if(typeof(name) == 'string')
        return resolveComponent(name)

    return name || null
}

export function resolveDirective(name) {
    return currentRenderingInstance && currentRenderingInstance.directive(name) || null
}

// ------------------------------------------------------------
// lifecycles

export function createHook(name) {
    return function(cb) {
        if(!currentRenderingInstance)
            return console.warn(name + " called outside of component render function")
    
        currentRenderingInstance.on_hook(name, cb)
    }
}

export const onBeforeMount = createHook('beforeMount')
export const onMounted = createHook('mounted')
export const onBeforeUpdate = createHook('beforeUpdate')
export const onUpdated = createHook('updated')
export const onBeforeUnmount = createHook('beforeUnmount')
export const onUnmounted = createHook('unmounted')
export const onServerPrefetch = createHook('serverPrefetch')
export const onRenderTracked = createHook('renderTracked')
export const onRenderTriggered = createHook('renderTriggered')
export const onErrorCaptured = createHook('errorCaptured')
export const onActivated = createHook('activated')
export const onDeactivated = createHook('deactivated')

// ------------------------------------------------------------

export { handleError } from './helpers/errors.js'
export { createApp, createApp as createSSRApp, defineComponent, defineComponent as defineCustomElement, CompositionContext } from './component.js'

// ------------------------------------------------------------

export function provide(key, value) {
    if(!currentRenderingInstance)
        return console.warn("provide called outside of component render function")

    currentRenderingInstance.provide(key, value)
}

export function inject(key, defaultValue, treatDefaultAsFactory = true) {
    if(!currentRenderingInstance)
        return console.warn("inject called outside of component render function")

    currentRenderingInstance.inject(key, defaultValue, treatDefaultAsFactory)
}

// ------------------------------------------------------------

export function withMemo(memo, render, cache, index) {
    const cached = cache[index]
    if (cached && isMemoSame(cached, memo)) {
        return cached.render
    }

    const ret = render()
    cache[index] = {
        memo:   memo.slice(),
        render: ret,
    }

    return ret
}

export function cloneVNode(node, props) {
    return React.cloneElement(node, props)
}

export function isVNode(node) {
    return React.isValidElement(node)
}

// export function vShow(el, { value }) {
//     if(!value) {
//         el.style.display = 'none'
//     }
// }

export const vShow = {
    // called before bound element's attributes
    // or event listeners are applied
    created(el, { value }) {
        if(!value) {
            el.style.display = 'none'
        }
    },

    // called before the parent component is updated
    beforeUpdate(el, { value })  {
        if(!value) {
            el.style.display = 'none'
        }
    },
}

export function useCssVars(vars) {
    if(!currentRenderingInstance)
        return console.warn("useCssVars called outside of component render function")

    currentRenderingInstance.useCssVars(vars)
}

export function useSlots() {
    if(!currentRenderingInstance)
        return console.warn("useCssVars called outside of component render function")

    return currentRenderingInstance.$slots
}

export function useAttrs() {
    if(!currentRenderingInstance)
        return console.warn("useCssVars called outside of component render function")

    return currentRenderingInstance.$attrs
}

export function withAsyncContext(ctx) {
    if(!currentRenderingInstance)
        return console.warn("withAsyncContext called outside of component render function")

    var current = currentRenderingInstance
    return [ctx(), () => currentRenderingInstance = current]
}

// TODO: exported from vue:
// exports.BaseTransition = BaseTransition;
// exports.Comment = Comment;
// exports.Static = Static;
// exports.Teleport = Teleport;
// exports.Text = Text;

// exports.callWithAsyncErrorHandling = callWithAsyncErrorHandling;
// exports.callWithErrorHandling = callWithErrorHandling;

// exports.createHydrationRenderer = createHydrationRenderer;
// exports.createPropsRestProxy = createPropsRestProxy;
// exports.createSlots = createSlots;
// exports.createStaticVNode = createStaticVNode;
// exports.getTransitionRawChildren = getTransitionRawChildren;
// exports.initCustomFormatter = initCustomFormatter;
// exports.popScopeId = popScopeId;
// exports.pushScopeId = pushScopeId;
// exports.queuePostFlushCb = queuePostFlushCb;
// exports.registerRuntimeCompiler = registerRuntimeCompiler;
// exports.resolveFilter = resolveFilter;
// exports.resolveTransitionHooks = resolveTransitionHooks;
// exports.setDevtoolsHook = setDevtoolsHook;
// exports.setTransitionHooks = setTransitionHooks;
// exports.transformVNodeArgs = transformVNodeArgs;
// exports.useSSRContext = useSSRContext;
// exports.useTransitionState = useTransitionState;
// exports.withScopeId = withScopeId;
