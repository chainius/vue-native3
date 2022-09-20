

    const __DEFAULT_WITH_TEMPLATE__ = {
        name: 'lvl1',
        inject: {
            test: {
                default: 'x',
                from:    'foo',
            }
        }
    }



import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, renderSlot as _renderSlot, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = /*#__PURE__*/_createTextVNode("no slot found")

function __TEMPLATE_RENDER__(_ctx, _cache) {
  const _component_text = _resolveComponent("text")
  const _component_view = _resolveComponent("view")

  return (_openBlock(), _createBlock(_component_view, null, {
    default: _withCtx(() => [
      _createVNode(_component_text, null, {
        default: _withCtx(() => [
          _createTextVNode("testing lvl1 " + _toDisplayString(_ctx.test), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }),
      _renderSlot(_ctx.$slots, "abc", { x: "slot-x" }, () => [
        _createVNode(_component_text, null, {
          default: _withCtx(() => [
            _hoisted_1
          ]),
          _: 1 /* STABLE */
        })
      ])
    ]),
    _: 3 /* FORWARDED */
  }))
}

export default Object.assign(__DEFAULT_WITH_TEMPLATE__, { render: __TEMPLATE_RENDER__ })