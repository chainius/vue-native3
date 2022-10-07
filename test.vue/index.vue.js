import { StyleSheet as __REACT_STYLESHEET__ } from 'react-native';
const __VUE_STYLESHEET__ = __REACT_STYLESHEET__.create({
  "text2": {
    "flexGrow": 1,
    "flexShrink": 1,
    "flexBasis": 0,
    "width": "100%",
    "justifyContent": "center",
    "alignItems": "center",
    "backgroundColor": "green"
  }
})

import { createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, toDisplayString as _toDisplayString, Suspense as _Suspense, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = /*#__PURE__*/_createTextVNode("normal component")
const _hoisted_2 = /*#__PURE__*/_createTextVNode("inner suspensed text")
const _hoisted_3 = /*#__PURE__*/_createTextVNode("Loading...")

export function render(_ctx, _cache) {
  const _component_text = _resolveComponent("text")
  const _component_lvl1 = _resolveComponent("lvl1")
  const _component_view = _resolveComponent("view")

  return (_openBlock(), _createBlock(_component_view, { class: "text text2" }, {
    default: _withCtx(() => [
      _createVNode(_component_text, null, {
        default: _withCtx(() => [
          _hoisted_1
        ]),
        _: 1 /* STABLE */
      }),
      (_openBlock(), _createBlock(_Suspense, {
        onPending: _ctx.onPending,
        onFallback: _ctx.onFallback,
        onResolve: _ctx.onResolve
      }, {
        fallback: _withCtx(() => [
          _createVNode(_component_text, null, {
            default: _withCtx(() => [
              _hoisted_3
            ]),
            _: 1 /* STABLE */
          })
        ]),
        default: _withCtx(() => [
          _createVNode(_component_lvl1, {
            key: "lvl1",
            class: "text"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_text, null, {
                default: _withCtx(() => [
                  _createTextVNode("test.vue " + _toDisplayString(_ctx.i) + " " + _toDisplayString(_ctx.color), 1 /* TEXT */)
                ]),
                _: 1 /* STABLE */
              })
            ]),
            _: 1 /* STABLE */
          }),
          _createVNode(_component_text, null, {
            default: _withCtx(() => [
              _hoisted_2
            ]),
            _: 1 /* STABLE */
          })
        ]),
        _: 1 /* STABLE */
      }, 8 /* PROPS */, ["onPending", "onFallback", "onResolve"]))
    ]),
    _: 1 /* STABLE */
  }))
}

const __DEFAULT_WITH_TEMPLATE__ = {
  __name: "index",
  render,
  stylesheet: __VUE_STYLESHEET__,
}

import { defineComponent as _frsDefineComponent } from 'vue'
export default _frsDefineComponent(__DEFAULT_WITH_TEMPLATE__)