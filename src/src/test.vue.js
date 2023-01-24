import { resolveComponent, openBlock, createBlock, withCtx, createVNode, createTextVNode, toDisplayString, defineComponent } from 'vue';

var options = {
  __name: 'test',
  props: {
        style : [Object,undefined],
        abdel : String
    },
  setup(__props) {

    

    //console.log(test2.style)

return (_ctx, _cache) => {
  const _component_text = resolveComponent("text");
  const _component_view = resolveComponent("view");

  return (openBlock(), createBlock(_component_view, null, {
    default: withCtx(() => [
      createVNode(_component_text, null, {
        default: withCtx(() => [
          createTextVNode(toDisplayString(_ctx.$props.style), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      }),
      createVNode(_component_text, null, {
        default: withCtx(() => [
          createTextVNode("this is the prop " + toDisplayString(__props.abdel), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      })
    ]),
    _: 1 /* STABLE */
  }))
}
}

};

var test = defineComponent(options);

export { test as default };
