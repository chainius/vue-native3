import { StyleSheet as __REACT_STYLESHEET__ } from 'react-native';
function __VUE_STYLESHEET__(stylesheet) {
    return __REACT_STYLESHEET__.create({
        "text": {
            "backgroundColor": stylesheet["tjyk59itq1-color"],
            "color": stylesheet["tjyk59itq1-theme_color"],
        },
        "text2": {
            "flexGrow": 1,
            "flexShrink": 1,
            "flexBasis": 0,
            "width": "100%",
            "justifyContent": "center",
            "alignItems": "center",
            "backgroundColor": "green",
        },

    })
}

import { useCssVars as _useCssVars } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, vShow as _vShow, withCtx as _withCtx, createVNode as _createVNode, withDirectives as _withDirectives, isRef as _isRef, unref as _unref, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = /*#__PURE__*/_createTextVNode("inner slot")



    const __default__ = {
        name: 'test-component',
        data() {
            return {
                color: '#212121'
            }
        },
        mounted() {
            var i = 0 
            var colors = [
                'blue',
                'purple',
                'black',
                'red',
            ]

            setInterval(() => {
                i++
                this.color = colors[i%colors.length]
            }, 1000)
        },
    }


import Lvl1 from '../lvl1.vue/index.vue'
    import Test from './test.js'
    import { ref } from 'vue'

    
const __DEFAULT_WITH_TEMPLATE__ = /*#__PURE__*/Object.assign(__default__, {
  setup(__props) {

_useCssVars(_ctx => ({
  "tjyk59itq1-color": (_ctx.color),
  "tjyk59itq1-theme_color": (theme.color)
}))


    const i = ref(0)
    const b = ref(0)

    setInterval(() => {
        i.value++

        if(i.value % 2 == 0)
            b.value++
    }, 1000)

    const theme = {
        color: 'white'
    }


return (_ctx, _cache) => {
  const _component_text = _resolveComponent("text")
  const _component_view = _resolveComponent("view")

  return (_openBlock(), _createBlock(_component_view, { class: "text text2" }, {
    default: _withCtx(() => [
      _withDirectives(_createVNode(_component_text, null, {
        default: _withCtx(() => [
          _createTextVNode(" test.vue " + _toDisplayString(i.value), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }, 512 /* NEED_PATCH */), [
        [_vShow, b.value]
      ]),
      _createVNode(_component_view, {
        modelValue: _ctx.color,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => (_isRef(color) ? (color).value = $event : null)),
        modelModifiers: { lazy: true }
      }, null, 8 /* PROPS */, ["modelValue"]),
      _createVNode(_component_text, {
        ref: "test",
        class: "text"
      }, {
        default: _withCtx(() => [
          _createTextVNode("test.vue " + _toDisplayString(i.value) + " " + _toDisplayString(_ctx.color), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }, 512 /* NEED_PATCH */),
      _createVNode(Lvl1, null, {
        default: _withCtx(() => [
          _createVNode(_component_text, null, {
            default: _withCtx(() => [
              _hoisted_1
            ]),
            _: 1 /* STABLE */
          })
        ]),
        _: 1 /* STABLE */
      }),
      _createVNode(_unref(Test))
    ]),
    _: 1 /* STABLE */
  }))
}
}

})

__DEFAULT_WITH_TEMPLATE__.stylesheet = __VUE_STYLESHEET__
export default __DEFAULT_WITH_TEMPLATE__