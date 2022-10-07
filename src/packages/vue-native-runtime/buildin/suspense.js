import React, { useState, useEffect } from 'react'
import { handleError } from '../helpers/errors'

export class Suspense extends React.PureComponent {
    #fallbackTimeout = null

    #renderers = {}

    state = {
        show_fallback:    true,
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

    componentWillUnmount() {
        clearTimeout(this.#fallbackTimeout)
    }

    render() {
        const children = this.children
        var resolved = true
        var loaderStarted = false
        var showing = []

        // resolves react async dependencies
        for(var i in children) {
            var child = children[i]
            if(this.#renderers[i]) {
                try {
                    showing[i] = this.#renderers[i](child.props)
                } catch(e) {
                    handleError(e, this.props.$parent, 'Suspense')
                }

                continue
            }

            if(!child || !child.type || !child.type._init || !child.type._payload) {
                showing[i] = child
                continue
            }

            showing[i] = null

            // child should only init once
            if(!this.#renderers[i]) {
                this.#renderers[i] = () => null

                try {
                    var R = child.type._init(child.type._payload, true, child.props)

                    if(typeof(R) == 'function')
                        this.#renderers[i] = (props) => <R {...props} />
                    else
                        this.#renderers[i] = () => null
                } catch(e) {
                    if(!e?.then) {
                        handleError(e, this.props.$parent, 'Suspense')
                        continue
                    }

                    resolved = false
                    this.state.has_pending_deps = true
                    loaderStarted = true

                    var index = i

                    e.then((r) => {
                        this.#renderers[index] = r?.default || r
                        this.setState({ has_pending_deps: false })
                    }).catch((e) => {
                        handleError(e, this.props.$parent, 'Suspense')
                    })
                }
            }

            try {
                showing[i] = this.#renderers[i](child.props)
            } catch(e) {
                handleError(e, this.props.$parent, 'Suspense')
            }
        }

        if(loaderStarted && this.props.onPending)
            this.props.onPending()

        if(resolved) {
            if(!this.state.resolve_emiited && this.props.onResolve) {
                this.props.onResolve()
                this.state.resolve_emiited = true
            }

            return React.createElement(React.Fragment, {}, ...showing)
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

    var setters = {}
    var id = 0
    var attempts = 1

    const payload = {
        _result: null,
        _status: -1,
    }

    function start_loader(onDone, $parent) {
        payload._status = 0

        // start async process
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
                    setImmediate(start_loader.bind(this, onDone, $parent))
                    throw('retry')
                }
            } else {
                handleError(err, $parent, 'AsyncComponent')
            }

            onDone()
            payload._result = () => null
            payload._status = 2

            return options.errorComponent ? <options.errorComponent /> : null
        }).then((res) => {
            onDone()
            var n = setters
            setters = null

            for(var i in n) {
                n[i](res)
            }
        }).catch((e) => {
            if(e == 'retry')
                return

            onDone()
            handleError(e, $parent, 'AsyncComponent')
        })
    }

    function _fallback(Fallback) {
        if(setters === null)
            return

        for(var i in setters) {
            setters[i](<Fallback />)
        }
    }

    // create render function that will handle states till async component is loaded
    payload._result = function render(props) {
        const [data, setData] = useState({
            id:        id++,
            component: options.loadingComponent && options.delay <= 0 ? <options.loadingComponent /> : null,
        })

        // add changes listener
        useEffect(() => {
            if(setters === null)
                return

            var id = data.id
            setters[id] = (v) => {
                if(v === null)
                    return setData(null)

                setData({
                    id:        data.id,
                    component: v,
                })
            }

            return () => {
                if(setters !== null) {
                    delete setters[id]
                }
            }
        })

        // return loaded component
        if(payload._status == 1) {
            return payload._result(props)
        }

        if(payload._status == -1) {
            var delay = null
            var timeout = null

            // support delay
            if(options.delay > 0 && options.loadingComponent) {
                delay = setTimeout(_fallback.bind(this, options.loadingComponent), options.delay)
            }

            // support timeout
            if(options.timeout > 0 && options.errorComponent) {
                timeout = setTimeout(_fallback.bind(this, options.errorComponent), options.timeout)
            }

            start_loader(function() {
                clearTimeout(delay)
                clearTimeout(timeout)
            }, props.$parent)
        }

        return data.component
    }

    // return suspensible component
    return {
        $$typeof: Symbol.for('react.lazy'),
        _init:    function(payload, suspense = false) {
            if(payload._status < 1 && options.suspensible !== false && suspense) {
                payload._status = 0

                const r = options.loader().then((v) => {
                    payload._result = v
                    payload._status = 1
                    return v
                }).catch((e) => {
                    payload._result = () => null
                    payload._status = 2
                    return null
                })

                throw(r)
            }

            return payload._result
        },
        _payload: payload,
    }
}