import { StyleSheet as __REACT_STYLESHEET__ } from 'react-native';
const __VUE_STYLESHEET__ = __REACT_STYLESHEET__.create({
  "title": {
    "color": "#fff",
    "fontSize": 25,
    "marginBottom": 15
  },
  "value": {
    "color": "#fff",
    "fontSize": 20
  }
})



    const __DEFAULT_WITH_TEMPLATE__ = {
        name: 'lvl1',
        props: {
            title: {
                type: String,
                default: 'lvl1'
            }
        },
        data() {
            return {
                i: 0
            }
        },
        methods: {
            increment() {
                this.i++
            }
        },
        activated() {
            console.log('lvl1 activated')
        },
        deactivated() {
            console.log('lvl1 deactivated')
        }
    }



import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"

function __TEMPLATE_RENDER__(_ctx, _cache) {
  const _component_text = _resolveComponent("text")
  const _component_touchable = _resolveComponent("touchable")

  return (_openBlock(), _createBlock(_component_touchable, {
    onPress: _ctx.increment,
    style: {"backgroundColor":"blue"}
  }, {
    default: _withCtx(() => [
      _createVNode(_component_text, { class: "title" }, {
        default: _withCtx(() => [
          _createTextVNode(_toDisplayString(_ctx.title) + " first", 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }),
      _createVNode(_component_text, { class: "value" }, {
        default: _withCtx(() => [
          _createTextVNode(_toDisplayString(_ctx.i), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      })
    ]),
    _: 1 /* STABLE */
  }, 8 /* PROPS */, ["onPress"]))
}

export default Object.assign({ render: __TEMPLATE_RENDER__, __name: "index", stylesheet: __VUE_STYLESHEET__ }, __DEFAULT_WITH_TEMPLATE__)