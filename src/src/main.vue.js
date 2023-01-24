import { ref, resolveComponent, openBlock, createBlock, withCtx, createVNode, createTextVNode, toDisplayString, unref, defineComponent } from 'vue';
import test from './test.vue';
import { StyleSheet } from 'react-native';

// console.log(app)
    // console.log(test)
    
    const __default__ = {
        name: 'test'
    };

    
var options = /*#__PURE__*/Object.assign(__default__, {
  props: {
        abdel : String
    },
  setup(__props) {

const test2 = __props;

    

    const x = ref('abdel');

    setTimeout(() => {
        console.log("change");
        x.value = 'abc';
    }, 1000);

    //console.log("test file", test2.abdel)
    // var $filters = {
    //     testFunction(n, a, b) {
    //         console.log("testFunction")
    //         return 'hello ['+n+'] xx ' + a + ' => ' + b
    //     }
    // }


return (_ctx, _cache) => {
  const _component_text = resolveComponent("text");
  const _component_view = resolveComponent("view");

  return (openBlock(), createBlock(_component_view, { class: "container" }, {
    default: withCtx(() => [
      createVNode(_component_text, { style: {"fontSize":"60"} }, {
        default: withCtx(() => [
          createTextVNode("Vue3 App")
        ]),
        _: 1 /* STABLE */
      }),
      createVNode(_component_text, null, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(JSON.stringify(unref(test2))), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }),
      createVNode(test, {
        style: {"fontSize":"60"},
        abdel: x.value
      }, null, 8 /* PROPS */, ["abdel"]),
      createVNode(_component_text, null, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(x.value), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      })
    ]),
    _: 1 /* STABLE */
  }))
}
}

});

var stylesheet = StyleSheet.create({
    "container": {
        "flexGrow": 1,
        "flexShrink": 1,
        "flexBasis": 0,
        "justifyContent": "center",
        "alignItems": "center"
    }
});

options.stylesheet = stylesheet;
                    var main = defineComponent(options);

export { main as default };
