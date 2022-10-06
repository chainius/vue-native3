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

import { withAsyncContext as _withAsyncContext } from 'vue'
import { unref as _unref, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"



    const __default__ = {
        name: 'lvl2',
        props: {
            title: {
                type: String,
                default: 'lvl2'
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
            console.log('lvl2 activated')
        },
        deactivated() {
            console.log('lvl2 deactivated')
        }
    }


import { withHooks } from 'vue'
    import { useState } from 'react';

    
const __DEFAULT_WITH_TEMPLATE__ = /*#__PURE__*/Object.assign(__default__, {
  async setup(__props) {

let __temp, __restore


    var lastTimeout = null

    const tm = new Promise((resolve) => setTimeout(resolve, 1000))
    ;(
  ([__temp,__restore] = _withAsyncContext(() => tm)),
  await __temp,
  __restore()
)
    console.log('timeout reached')

    const state = withHooks(() => {
        const [ count, setCount ] = useState(0);

        clearTimeout(lastTimeout)
        lastTimeout = setTimeout(() => {
            setCount(count + 1);
        }, 10);

        return {
            count: 1000 + count,
        }
    })


return (_ctx, _cache) => {
  const _component_text = _resolveComponent("text")
  const _component_touchable = _resolveComponent("touchable")

  return (_openBlock(), _createBlock(_component_touchable, {
    onPress: _ctx.increment,
    style: {"backgroundColor":"red","flex":"1","justifyContent":"center","alignItems":"center"}
  }, {
    default: _withCtx(() => [
      _createVNode(_component_text, { class: "title" }, {
        default: _withCtx(() => [
          _createTextVNode(_toDisplayString(_unref(state).count) + " second", 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      })
    ]),
    _: 1 /* STABLE */
  }, 8 /* PROPS */, ["onPress"]))
}
}

})

__DEFAULT_WITH_TEMPLATE__.stylesheet = __VUE_STYLESHEET__
export default __DEFAULT_WITH_TEMPLATE__