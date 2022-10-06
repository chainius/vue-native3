import { reactive } from '@vue/reactivity'
import { Text, View } from 'react-native'

export function enableHooks(instance, hooks) {
    const render = instance.render.bind(instance)
    var state = reactive({})

    const Hooks = function() {
        const res = hooks()
        Object.assign(state, res || {})

        return render()

        return <View style={{ backgroundColor: 'red', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: '50px' }}>{ state.count }</Text>
        </View>
    }

    instance.render = function() {
        return <Hooks {...this.props} />
    }

    return state
}