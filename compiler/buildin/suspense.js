import React from 'react'
import { handleError } from '../helpers/errors'

export class Suspense extends React.PureComponent {
    #fallbackTimeout = null

    state = {
        show_fallback: true,
        has_pending_deps: false,
    }

    constructor(props) {
        super(props)

        const timeout = parseInt(props.timeout)
        if(timeout > 0 && !isNaN(timeout) && isFinite(timeout)) {
            this.state.show_fallback = false

            this.#fallbackTimeout = setTimeout(() => {
                this.setState({ show_fallback: true })
                this.#fallbackTimeout = null
            }, timeout)
        }
    }

    get children() {
        var { children, $slots } = this.props
        if($slots && $slots.default)
            children = $slots.default()

        if(!Array.isArray(children))
            children = [children]

        return children
    }

    async load(child, i) {
        return await child.type._init(child.type._payload)
    }

    componentWillUnmount() {
        clearTimeout(this.#fallbackTimeout)
    }

    render() {
        const children = this.children
        var resolved = true
        var loaderStarted = false

        // resolves react async dependencies
        for(var i in children) {
            var child = children[i]
            if(!child.type || !child.type._init || child.type.render || !child.type._payload)
                continue

            if(child.type._payload?._status == 1) {
                children[i] = child.type._payload._result.default && child.type._payload._result.default(child.props) || null
                continue
            }

            resolved = false
            this.state.has_pending_deps = true

            if(child.type._payload?._status == -1) {
                loaderStarted = true

                this.load(child, i).catch((e) => {
                    return e
                }).catch((e) => {
                    handleError(e, this.props.$parent, 'Suspense')
                }).then(() => {
                    this.setState({ has_pending_deps: false })
                })
            }
        }

        if(loaderStarted && this.props.onPending)
            this.props.onPending()

        if(resolved) {
            if(!this.state.resolve_emiited && this.props.onResolve) {
                this.props.onResolve()
                this.state.resolve_emiited = true
            }

            return React.createElement(React.Fragment, {}, ...children)
        }

        // show fallback
        if(!this.state.show_fallback)
            return null

        var fallback = null

        if(this.props.$slots?.fallback) {
            fallback = this.props.$slots?.fallback()
            fallback = React.createElement(React.Fragment, {}, ...fallback)
        }

        if(this.props.fallback) {
            fallback = this.props.fallback
        }

        if(fallback !== null && !this.state.fallback_emitted) {
            this.state.fallback_emitted = true
            this.props.onFallback && this.props.onFallback()
        }

        return fallback
    }
}

Suspense.$slots = true