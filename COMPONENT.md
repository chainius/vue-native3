# Vue Component API
> Vue component actually runs in the React runtime. It means that the  ```VNode``` used on the react runtime are in fact React Elements. Direct manipulation of a VNode could causes some incompatibilities. Conversely, if your previous Vue component does not involve VNode manipulation, it would most likely run directly in React. 


# Supported API
> All the features strikethrough are not supported in React Native

## Global API

### Application

* [createApp()](https://vuejs.org/api/application.html#createapp)
* [app.provide()](https://vuejs.org/api/application.html#app-provide)
* [app.component()](https://vuejs.org/api/application.html#app-component)
* [app.directive()](https://vuejs.org/api/application.html#app-directive)
* [app.use()](https://vuejs.org/api/application.html#app-use)
* [app.mixin()](https://vuejs.org/api/application.html#app-mixin)
* [app.version](https://vuejs.org/api/application.html#app-version)
* [app.config](https://vuejs.org/api/application.html#app-config)
* [app.config.globalProperties](https://vuejs.org/api/application.html#app-config-globalproperties)
* [app.config.errorHandler](https://vuejs.org/api/application.html#app-config-errorhandler)
* ~~[app.config.warnHandler](https://vuejs.org/api/application.html#app-config-warnhandler)~~
* ~~[app.config.performance](https://vuejs.org/api/application.html#app-config-performance)~~
* ~~[app.config.compilerOptions](https://vuejs.org/api/application.html#app-config-compileroptions)~~
* ~~[app.config.optionMergeStrategies](https://vuejs.org/api/application.html#app-config-optionmergestrategies)~~
* ~~[createSSRApp()](https://vuejs.org/api/application.html#createssrapp)~~
* ~~[app.mount()](https://vuejs.org/api/application.html#app-mount)~~
* ~~[app.unmount()](https://vuejs.org/api/application.html#app-unmount)~~


### General
* [version](https://vuejs.org/api/general.html#version)
* [nextTick()](https://vuejs.org/api/general.html#nexttick)
* [defineComponent()](https://vuejs.org/api/general.html#definecomponent)
* [defineAsyncComponent()](https://vuejs.org/api/general.html#defineasynccomponent)
* [defineCustomElement()](https://vuejs.org/api/general.html#definecustomelement)


---
## Composition API

### setup()
* [Basic Usage](https://vuejs.org/api/composition-api-setup.html#basic-usage)
* [Accessing Props](https://vuejs.org/api/composition-api-setup.html#accessing-props)
* [Setup Context](https://vuejs.org/api/composition-api-setup.html#setup-context)
* [Usage with Render Functions](https://vuejs.org/api/composition-api-setup.html#usage-with-render-functions)


### Reactivity: Core
* [ref()](https://vuejs.org/api/reactivity-core.html#ref)
* [computed()](https://vuejs.org/api/reactivity-core.html#computed)
* [reactive()](https://vuejs.org/api/reactivity-core.html#reactive)
* [readonly()](https://vuejs.org/api/reactivity-core.html#readonly)
* [watchEffect()](https://vuejs.org/api/reactivity-core.html#watcheffect)
* [watchPostEffect()](https://vuejs.org/api/reactivity-core.html#watchposteffect)
* [watchSyncEffect()](https://vuejs.org/api/reactivity-core.html#watchsynceffect)
* [watch()](https://vuejs.org/api/reactivity-core.html#watch)


### Reactivity: Utilities
* [isRef()](https://vuejs.org/api/reactivity-utilities.html#isref)
* [unref()](https://vuejs.org/api/reactivity-utilities.html#unref)
* [toRef()](https://vuejs.org/api/reactivity-utilities.html#toref)
* [toRefs()](https://vuejs.org/api/reactivity-utilities.html#torefs)
* [isProxy()](https://vuejs.org/api/reactivity-utilities.html#isproxy)
* [isReactive()](https://vuejs.org/api/reactivity-utilities.html#isreactive)
* [isReadonly()](https://vuejs.org/api/reactivity-utilities.html#isreadonly)


### Reactivity: Advanced
* [shallowRef()](https://vuejs.org/api/reactivity-advanced.html#shallowref)
* [triggerRef()](https://vuejs.org/api/reactivity-advanced.html#triggerref)
* [customRef()](https://vuejs.org/api/reactivity-advanced.html#customref)
* [shallowReactive()](https://vuejs.org/api/reactivity-advanced.html#shallowreactive)
* [shallowReadonly()](https://vuejs.org/api/reactivity-advanced.html#shallowreadonly)
* [toRaw()](https://vuejs.org/api/reactivity-advanced.html#toraw)
* [markRaw()](https://vuejs.org/api/reactivity-advanced.html#markraw)
* [effectScope()](https://vuejs.org/api/reactivity-advanced.html#effectscope)
* [getCurrentScope()](https://vuejs.org/api/reactivity-advanced.html#getcurrentscope)
* [onScopeDispose()](https://vuejs.org/api/reactivity-advanced.html#onscopedispose)


### Lifecycle Hooks
* [onMounted()](https://vuejs.org/api/composition-api-lifecycle.html#onmounted)
* [onUpdated()](https://vuejs.org/api/composition-api-lifecycle.html#onupdated)
* [onUnmounted()](https://vuejs.org/api/composition-api-lifecycle.html#onunmounted)
* [onBeforeMount()](https://vuejs.org/api/composition-api-lifecycle.html#onbeforemount)
* [onBeforeUpdate()](https://vuejs.org/api/composition-api-lifecycle.html#onbeforeupdate)
* [onBeforeUnmount()](https://vuejs.org/api/composition-api-lifecycle.html#onbeforeunmount)
* [onErrorCaptured()](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured)
* [onRenderTracked()](https://vuejs.org/api/composition-api-lifecycle.html#onrendertracked)
* [onRenderTriggered()](https://vuejs.org/api/composition-api-lifecycle.html#onrendertriggered)
* [onActivated()](https://vuejs.org/api/composition-api-lifecycle.html#onactivated)
* [onDeactivated()](https://vuejs.org/api/composition-api-lifecycle.html#ondeactivated)
* ~~[onServerPrefetch()](https://vuejs.org/api/composition-api-lifecycle.html#onserverprefetch)~~


### Dependency Injection
* [provide()](https://vuejs.org/api/composition-api-dependency-injection.html#provide)
* [inject()](https://vuejs.org/api/composition-api-dependency-injection.html#inject)


---
## Options API


### Options: State
* [data](https://vuejs.org/api/options-state.html#data)
* [props](https://vuejs.org/api/options-state.html#props)
* [computed](https://vuejs.org/api/options-state.html#computed)
* [methods](https://vuejs.org/api/options-state.html#methods)
* [watch](https://vuejs.org/api/options-state.html#watch)
* [emits](https://vuejs.org/api/options-state.html#emits)
* [expose](https://vuejs.org/api/options-state.html#expose)


### Options: Rendering
* [render](https://vuejs.org/api/options-rendering.html#render)
* ~~[template](https://vuejs.org/api/options-rendering.html#template)~~
* ~~[compilerOptions](https://vuejs.org/api/options-rendering.html#compileroptions)~~


### Options: Lifecycle
* [beforeCreate](https://vuejs.org/api/options-lifecycle.html#beforecreate)
* [created](https://vuejs.org/api/options-lifecycle.html#created)
* [beforeMount](https://vuejs.org/api/options-lifecycle.html#beforemount)
* [mounted](https://vuejs.org/api/options-lifecycle.html#mounted)
* [beforeUpdate](https://vuejs.org/api/options-lifecycle.html#beforeupdate)
* [updated](https://vuejs.org/api/options-lifecycle.html#updated)
* [beforeUnmount](https://vuejs.org/api/options-lifecycle.html#beforeunmount)
* [unmounted](https://vuejs.org/api/options-lifecycle.html#unmounted)
* [errorCaptured](https://vuejs.org/api/options-lifecycle.html#errorcaptured)
* [renderTracked](https://vuejs.org/api/options-lifecycle.html#rendertracked)
* [renderTriggered](https://vuejs.org/api/options-lifecycle.html#rendertriggered)
* [activated](https://vuejs.org/api/options-lifecycle.html#activated)
* [deactivated](https://vuejs.org/api/options-lifecycle.html#deactivated)
* ~~[serverPrefetch](https://vuejs.org/api/options-lifecycle.html#serverprefetch)~~


### Options: Composition
* [provide](https://vuejs.org/api/options-composition.html#provide)
* [inject](https://vuejs.org/api/options-composition.html#inject)
* [mixins](https://vuejs.org/api/options-composition.html#mixins)
* [extends](https://vuejs.org/api/options-composition.html#extends)


### Options: Misc
* [name](https://vuejs.org/api/options-misc.html#name)
* [inheritAttrs](https://vuejs.org/api/options-misc.html#inheritattrs)
* [components](https://vuejs.org/api/options-misc.html#components)
* [directives](https://vuejs.org/api/options-misc.html#directives)


### Component Instance
* [$data](https://vuejs.org/api/component-instance.html#data)
* [$props](https://vuejs.org/api/component-instance.html#props)
* [$el](https://vuejs.org/api/component-instance.html#el)
* [$options](https://vuejs.org/api/component-instance.html#options)
* [$parent](https://vuejs.org/api/component-instance.html#parent)
  > the parent will only works if it has been passed a prop ($parent) from react native or if the parent element is a vue component
* [$root](https://vuejs.org/api/component-instance.html#root)
  > the root element of the app should be a non functional component warpped with createApp from vue in order to get a root instance
* [$slots](https://vuejs.org/api/component-instance.html#slots)
* [$refs](https://vuejs.org/api/component-instance.html#refs)
* [$attrs](https://vuejs.org/api/component-instance.html#attrs)
* [$watch()](https://vuejs.org/api/component-instance.html#watch)
* [$emit()](https://vuejs.org/api/component-instance.html#emit)
* [$forceUpdate()](https://vuejs.org/api/component-instance.html#forceupdate)
* [$nextTick()](https://vuejs.org/api/component-instance.html#forceupdate)


---
## Built-ins

### Directives
* [v-text](https://vuejs.org/api/built-in-directives.html#v-text)
* [v-html](https://vuejs.org/api/built-in-directives.html#v-html)
* [v-show](https://vuejs.org/api/built-in-directives.html#v-show)
* [v-if](https://vuejs.org/api/built-in-directives.html#v-if)
* [v-else](https://vuejs.org/api/built-in-directives.html#v-else)
* [v-else-if](https://vuejs.org/api/built-in-directives.html#v-else-if)
* [v-for](https://vuejs.org/api/built-in-directives.html#v-for)
* [v-on](https://vuejs.org/api/built-in-directives.html#v-on)
* [v-bind](https://vuejs.org/api/built-in-directives.html#v-bind)
* [v-model](https://vuejs.org/api/built-in-directives.html#v-model)
* [v-slot](https://vuejs.org/api/built-in-directives.html#v-slot)
* [v-once](https://vuejs.org/api/built-in-directives.html#v-once)
* [v-memo](https://vuejs.org/api/built-in-directives.html#v-memo)
* [v-cloak](https://vuejs.org/api/built-in-directives.html#v-cloak)
* ~~[v-pre](https://vuejs.org/api/built-in-directives.html#v-pre)~~


### Components
* [\<KeepAlive>](https://vuejs.org/api/built-in-components.html#keepalive)
* [\<Suspense>](https://vuejs.org/api/built-in-components.html#suspense)
* ~~[\<Transition>](https://vuejs.org/api/built-in-components.html#transition)~~
* ~~[\<TransitionGroup>](https://vuejs.org/api/built-in-components.html#transitiongroup)~~
* ~~[\<Teleport>](https://vuejs.org/api/built-in-components.html#teleport)~~



### Special Elements
* [\<component>](https://vuejs.org/api/built-in-special-elements.html#component)
* [\<slot>](https://vuejs.org/api/built-in-special-elements.html#slot)


### Special Attributes
* [key](https://vuejs.org/api/built-in-special-attributes.html#key)
* [ref](https://vuejs.org/api/built-in-special-attributes.html#ref)
* [is](https://vuejs.org/api/built-in-special-attributes.html#is)


---
## Single-File Component

### Syntax Specification
* [Overview](https://vuejs.org/api/sfc-spec.html#overview)
* [Language Blocks](https://vuejs.org/api/sfc-spec.html#language-blocks)
* [Automatic Name Inference](https://vuejs.org/api/sfc-spec.html#automatic-name-inference)
* [Pre-Processors](https://vuejs.org/api/sfc-spec.html#pre-processors)
* [Comments](https://vuejs.org/api/sfc-spec.html#comments)
* ~~[Src Imports](https://vuejs.org/api/sfc-spec.html#src-imports)~~


### \<script setup>
* [Basic Syntax](https://vuejs.org/api/sfc-script-setup.html#basic-syntax)
* [Reactivity](https://vuejs.org/api/sfc-script-setup.html#reactivity)
* [Using Components](https://vuejs.org/api/sfc-script-setup.html#using-components)
* [Using Custom Directives](https://vuejs.org/api/sfc-script-setup.html#using-custom-directives)
* [defineProps() & defineEmits()](https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits)
* [defineExpose()](https://vuejs.org/api/sfc-script-setup.html#defineexpose)
* [useSlots() & useAttrs()](https://vuejs.org/api/sfc-script-setup.html#useslots-useattrs)
* [Usage alongside normal \<script>](https://vuejs.org/api/sfc-script-setup.html#usage-alongside-normal-script)
* [Top-level await](https://vuejs.org/api/sfc-script-setup.html#top-level-await)
* [TypeScript-only Features](https://vuejs.org/api/sfc-script-setup.html#typescript-only-features)
* [Restrictions](https://vuejs.org/api/sfc-script-setup.html#restrictions)


### CSS Features
* [Scoped CSS](https://vuejs.org/api/sfc-css-features.html#scoped-css)
* [CSS Modules](https://vuejs.org/api/sfc-css-features.html#css-modules)
* [v-bind() in CSS](https://vuejs.org/api/sfc-css-features.html#v-bind-in-css)


---
## Single-File Component

### Render Function
* [h()](https://vuejs.org/api/render-function.html#h)
* [mergeProps()](https://vuejs.org/api/render-function.html#mergeprops)
* [cloneVNode()](https://vuejs.org/api/render-function.html#clonevnode)
* [isVNode()](https://vuejs.org/api/render-function.html#isvnode)
* [resolveComponent()](https://vuejs.org/api/render-function.html#resolvecomponent)
* [resolveDirective()](https://vuejs.org/api/render-function.html#resolvedirective)
* [withDirectives()](https://vuejs.org/api/render-function.html#withdirectives)
* [withModifiers()](https://vuejs.org/api/render-function.html#withdirectives)


### TypeScript Utility Types
* [PropType<T>](https://vuejs.org/api/utility-types.html#proptype-t)
* [ComponentCustomProperties](https://vuejs.org/api/utility-types.html#componentcustomproperties)
* [ComponentCustomOptions](https://vuejs.org/api/utility-types.html#componentcustomoptions)
* [ComponentCustomProps](https://vuejs.org/api/utility-types.html#componentcustomprops)
* [CSSProperties](https://vuejs.org/api/utility-types.html#cssproperties)

### Server-Side Rendering
* ~~[renderToString()](https://vuejs.org/api/ssr.html#rendertostring)~~
* ~~[renderToNodeStream()](https://vuejs.org/api/ssr.html#rendertonodestream)~~
* ~~[pipeToNodeWritable()](https://vuejs.org/api/ssr.html#pipetonodewritable)~~
* ~~[renderToWebStream()](https://vuejs.org/api/ssr.html#rendertowebstream)~~
* ~~[pipeToWebWritable()](https://vuejs.org/api/ssr.html#pipetowebwritable)~~
* ~~[renderToSimpleStream()](https://vuejs.org/api/ssr.html#rendertosimplestream)~~
* ~~[useSSRContext()](https://vuejs.org/api/ssr.html#usessrcontext)~~


### Custom Renderer
* ~~[createRenderer()](https://vuejs.org/api/custom-renderer.html#createrenderer)~~