- app.config.optionMergeStrategies

# https://vuejs.org/guide/essentials/application.html#app-configurations
- createApp.mount
- createApp.config.errorHandler
- createApp.component

# https://vuejs.org/guide/essentials/template-syntax.html#using-javascript-expressions
- app.config.globalProperties

# https://vuejs.org/guide/essentials/event-handling.html#event-modifiers
- <button @press.prevent="increment" class="abc cl2" :title="'test ' + count" />

# https://vuejs.org/guide/essentials/conditional.html#v-if-on-template
- v-model https://vuejs.org/guide/essentials/forms.html#text
- v-model.trim="msg"
- v-model.number="age"
- v-model.lazy="msg"

# https://vuejs.org/guide/components/async.html#loading-and-error-states
- async components

# https://vuejs.org/guide/reusability/custom-directives.html#introduction
- custom directives

# https://vuejs.org/guide/reusability/plugins.html#introduction
- custom plugins




### ---------------------

# Global API
Application
General

# Composition API
setup()
Reactivity: Core
Reactivity: Utilities
Reactivity: Advanced
Lifecycle Hooks
Dependency Injection

# Options API
Options: State
Options: Rendering
Options: Lifecycle
Options: Composition
Options: Misc
Component Instance

# Built-ins
Directives
Components
Special Elements
Special Attributes

# Single-File Component
Syntax Specification
script setup
CSS Features

# Advanced APIs
Render Function
Server-Side Rendering
TypeScript Utility Types
Custom Renderer