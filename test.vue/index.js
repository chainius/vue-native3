import $script from './script.js'
// import $style from './style.js'
// $script.style = $style

import { defineComponent } from '../compiler/runtime.js'
export default defineComponent($script)