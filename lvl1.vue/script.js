

    const __DEFAULT_WITH_TEMPLATE__ = {
        name: 'lvl1',
        inject: {
            test: {
                default: 'x',
                from:    'foo',
            }
        }
    }



import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"

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
      })
    ]),
    _: 1 /* STABLE */
  }))
}

export default Object.assign({ render: __TEMPLATE_RENDER__, __name: "index" }, __DEFAULT_WITH_TEMPLATE__)