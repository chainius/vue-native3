import React, { useState, useEffect } from 'react'
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

// --------------------

export function defineAsyncComponent(options) {
    if(typeof(options) == 'function') {
        options = { loader: options }
    }

    if(options.delay === undefined)
        options.delay = 200

    // delay?: number // TODO
    // timeout?: number // TODO
    // suspensible?: boolean

    var setters = {}
    var id = 0
    var attempts = 1

    const payload = {
        _result: null,
        _status: -1,
    }

    function start_loader() {
        payload._status = 0

        options.loader().then(r => {
            payload._result = r.default
            payload._status = 1
            return null
        }).catch(err => {
            if(options.onError) {
                var retry = false
                options.onError(err, () => {
                    retry = true
                }, () => {}, attempts)

                if(retry) {
                    attempts++
                    setImmediate(start_loader)
                    throw('retry')
                }
            } else {
                // TODO uses vue handler
            }

            payload._result = () => null
            payload._status = 2

            return {
                component: options.errorComponent ? <options.errorComponent /> : null,
            }
        }).then((res) => {
            var n = setters
            setters = null

            for(var i in n) {
                n[i](res)
            }
        }).catch((e) => {
            if(e == 'retry')
                return

            console.error(e) // TODO uses vue handler
        })
    }

    // create render function that will handle states till async component is loaded
    payload._result = function render(props) {
        const [data, setData] = useState({
            id:        id++,
            component: options.loadingComponent && options.delay <= 0 ? <options.loadingComponent /> : null,
        });

        // add changes listener
        useEffect(() => {
            if(setters === null)
                return

            var id = data.id
            setters[id] = setData
            return () => {
                if(setters !== null) {
                    delete setters[id]
                }
            };
        });

        // return loaded component
        if(payload._status == 1) {
            return payload._result(props)
        }

        if(payload._status == -1) {
            start_loader()
        }

        return data.component
    }

    // return suspensible component
    return {
        $$typeof: Symbol.for('react.lazy'),
        _init: function(payload, suspense = false) {
            if(payload._status < 1 && options.suspensible !== false && suspense)
                return options.loader

            return payload._result
        },
        _payload: payload,
    }
}