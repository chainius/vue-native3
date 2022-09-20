export function handleError(err, instance, type, throwInDev = true) {
    const cb = instance.$captureError
    if(cb && cb(err, instance, type)) {
        return
    }

    // ToDo emit to global handler if configured

    console.error("unhandled vue error", type, err)

    if(throwInDev && __DEV__) {
        throw(err)
    }
}