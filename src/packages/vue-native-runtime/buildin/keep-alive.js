import React from "react"
import { View } from 'react-native'
import shared from '@vue/shared'

function matches(pattern, name) {
    if (shared.isArray(pattern)) {
        return pattern.some((p) => matches(p, name))
    } else if (shared.isString(pattern)) {
        return pattern.split(',').includes(name)
    } else if (pattern.test) {
        return pattern.test(name)
    }

    /* istanbul ignore next */
    return false
}

export class KeepAlive extends React.PureComponent {
    #instances = []
    
    #instance_names = {}

    #reverse_instance_names = []

    #on_ref = []

    #refs = []

    #current = undefined

    getInstance(name, child) {
        if(this.props.include && !matches(this.props.include, name)) {
            return -1
        } else if(this.props.exclude && matches(this.props.exclude, name)) {
            return -1
        } else if(this.props.max <= 1) {
            return -1
        }

        var index = this.#instance_names[name]
        if(this.#current != index) {
            const old = this.#refs[this.#current]
            old && old.emit_hook && old.emit_hook('deactivated')
        }

        if(index === undefined) {
            index = this.#instances.length
            this.#instance_names[name] = index

            this.#reverse_instance_names.push(name)
            this.#refs.push(null)

            this.#on_ref.push((e) => {
                this.#refs[index] = e
            })

            child = React.cloneElement(child, { ref: this.#on_ref[index] })

            this.#instances.push(child)
            if(this.props.max && this.#instances.length > this.props.max) {
                this.shift()
            }
        } else {
            child = React.cloneElement(child, { ref: this.#on_ref[index] })
            this.#instances[index] = child

            if(index != this.#current) {
                const item = this.#refs[index]
                item && item.emit_hook && item.emit_hook('activated')
            }
        }

        this.#current = index
        return index
    }

    shift() {
        const name = this.#reverse_instance_names[0]
        this.#instances.shift()
        this.#reverse_instance_names.shift()
        this.#on_ref.shift()
        this.#refs.shift()
        delete this.#instance_names[name]
    }

    render() {
        if(!this.props.children) {
            return null
        }

        if(__DEV__ && Array.isArray(this.props.children) && this.props.children.length > 1) {
            if(!this._logged) {
                console.warn("KeepAlive should have only one child")
                this._logged = true
            }

            return this.props.children
        } else if(__DEV__) {
            this._logged = false
        }

        var child = this.props.children
        var type = child.type || {}
        var name = child.key || this.props.name || type.displayName || type.name || (type.render && (type.render.displayName || type.render.name)) || "Unknown"

        var instance = this.getInstance(name, child)

        // ----

        const childs = []
        for(var i in this.#instances) {
            var style = Object.create(this.props.style || {})
            if(i != instance) {
                style.display = 'none'
            }
         
            childs.push(<View key={i} style={style}>{ this.#instances[i] }</View>)
        }

        return childs
    }
}