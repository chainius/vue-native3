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



    // import Lvl1 from '../lvl1.vue/index.vue'
    import Lvl2 from '../lvl2.vue/index.vue'

    const __DEFAULT_WITH_TEMPLATE__ = {
        components: {
            // Lvl1,
            Lvl2,
        },
        name: 'test-component',
        errorCaptured(e) {
            console.log('error captured from component', e)
        },
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
        methods: {
            onPending() {
                console.log('pending process started')
            },
            onFallback() {
                console.log('showing fallback')
            },
            onResolve() {
                console.log('suspense resolved')
            }
        }
    }



import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, Suspense as _Suspense, openBlock as _openBlock, createBlock as _createBlock } from "vue"

const _hoisted_1 = /*#__PURE__*/_createTextVNode("normal component")
const _hoisted_2 = /*#__PURE__*/_createTextVNode("Loading...")

function __TEMPLATE_RENDER__(_ctx, _cache) {
  const _component_text = _resolveComponent("text")
  const _component_lvl1 = _resolveComponent("lvl1")
  const _component_view = _resolveComponent("view")

  return (_openBlock(), _createBlock(_component_view, { class: "text text2" }, {
    default: _withCtx(() => [
      (_openBlock(), _createBlock(_Suspense, {
        onPending: _ctx.onPending,
        onFallback: _ctx.onFallback,
        onResolve: _ctx.onResolve,
        timeout: "1000"
      }, {
        fallback: _withCtx(() => [
          _createVNode(_component_text, null, {
            default: _withCtx(() => [
              _hoisted_2
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
              _hoisted_1
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

export default Object.assign({ render: __TEMPLATE_RENDER__, __name: "index", stylesheet: __VUE_STYLESHEET__ }, __DEFAULT_WITH_TEMPLATE__)