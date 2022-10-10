export default function mixin(options, plugin) {
    for(var key in plugin) {
        if(!options[key]) {
            options[key] = plugin[key]
            continue
        }

        if(typeof(options[key]) == 'object') {
            options[key] = mixin(options[key], plugin[key])
            continue
        }

        if(key == 'nodeTransforms') {
            const a = options[key]
            const b = plugin[key]

            options[key] = function(node, context) {
                if(a(node, context) === false)
                    return

                b(node, context)
            }
        } else {
            options[key] = plugin[key]
        }
    }

    return options
}