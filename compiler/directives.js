import React from "react"

export default class Directive extends React.PureComponent {
    constructor(props) {
        super(props)

        this.old_values = []

        this.emit('created')
        this.emit('beforeMount')
    }

    emit(name) {
        for(var i in this.props.directives) {
            var directive = this.props.directives[i]
            var [handler, value, arg, modifiers] = directive
            if(!handler || typeof(handler[name]) !== 'function')
                continue

            handler = handler[name]

            const binding = {
                value,
                arg,
                modifiers,
                instance: this.props.currentRenderingInstance,
                dir:      directive,
                oldValue: this.old_values[i],
            }

            handler(this.props.node, binding, {}, {})
            this.old_values[i] = value
        }
    }

    componentDidMount() {
        this.emit('mounted') // ToDo listen from parent event
    }

    getSnapshotBeforeUpdate() {
        this.emit('beforeUpdate') // ToDo listen from parent event
        return null
    }

    componentDidUpdate() {
        this.emit('updated') // ToDo listen from parent event
    }

    componentWillUnmount() {
        this.emit('beforeUnmount') // ToDo listen from parent event
        this.emit('unmounted') // ToDo listen from parent event
    }

    render() {
        return this.props.node || null
    }
}