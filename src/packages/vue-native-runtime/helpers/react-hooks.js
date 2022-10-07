export function enableHooks(instance, hooks) {
    const render = instance.render.bind(instance)
    var state = {}

    const Hooks = function() {
        const res = hooks()
        Object.assign(state, res || {})
        return render()
    }

    instance.render = function() {
        return <Hooks {...this.props} />
    }

    return state
}