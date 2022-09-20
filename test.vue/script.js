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



    import Lvl1 from '../lvl1.vue/index.vue'
    import Lvl2 from '../lvl2.vue/index.vue'

    const __DEFAULT_WITH_TEMPLATE__ = {
        components: {
            Lvl1,
            Lvl2,
        },
        name: 'test-component',
        data() {
            return {
                color: '#212121',
                item: 0,
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



import { resolveComponent as _resolveComponent, createVNode as _createVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, createCommentVNode as _createCommentVNode, KeepAlive as _KeepAlive } from "vue"

function __TEMPLATE_RENDER__(_ctx, _cache) {
  const _component_button = _resolveComponent("button")
  const _component_text = _resolveComponent("text")
  const _component_Text = _resolveComponent("Text")
  const _component_lvl1 = _resolveComponent("lvl1")
  const _component_lvl2 = _resolveComponent("lvl2")
  const _component_view = _resolveComponent("view")

  return (_openBlock(), _createBlock(_component_view, { class: "text text2" }, {
    default: _withCtx(() => [
      _createVNode(_component_button, {
        title: "change",
        onPress: _cache[0] || (_cache[0] = $event => (_ctx.item++))
      }),
      _createVNode(_component_text, { style: {"color":"#fff"} }, {
        default: _withCtx(() => [
          _createTextVNode("test level " + _toDisplayString(_ctx.item % 2), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }),
      (_openBlock(), _createBlock(_KeepAlive, null, [
        (_ctx.item % 2 == 0)
          ? (_openBlock(), _createBlock(_component_lvl1, {
              key: "lvl1",
              class: "text"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_Text, null, {
                  default: _withCtx(() => [
                    _createTextVNode("test.vue " + _toDisplayString(_ctx.i) + " " + _toDisplayString(_ctx.color), 1 /* TEXT */)
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _: 1 /* STABLE */
            }))
          : (_openBlock(), _createBlock(_component_lvl2, {
              class: "text",
              key: "lvl2"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_Text, null, {
                  default: _withCtx(() => [
                    _createTextVNode("test.vue " + _toDisplayString(_ctx.item), 1 /* TEXT */)
                  ]),
                  _: 1 /* STABLE */
                })
              ]),
              _: 1 /* STABLE */
            }))
      ], 1024 /* DYNAMIC_SLOTS */))
    ]),
    _: 1 /* STABLE */
  }))
}

export default Object.assign({ render: __TEMPLATE_RENDER__, __name: "index", stylesheet: __VUE_STYLESHEET__ }, __DEFAULT_WITH_TEMPLATE__)