const { createUnplugin } = require('unplugin')
var querystring = require('querystring')
var gql = require('graphql-tag')
var fs = require('fs')
var path = require('path')

function getAttributes(query) {
    var q = querystring.parse(query)
    delete q.vue
    delete q.type
    delete q.index
    delete q.blockType

    for(var key in q) {
        if(q[key] === 'true')
            q[key] = true
        else if(q[key] === 'false')
            q[key] = false
    }

    return q
}

function getHandlerPath(root) {
    var p = path.join(root, 'src', 'plugins', 'graphql.js')
    if(fs.existsSync(p))
        return p

    p = path.join(root, 'src', 'graphql.js')
    if(fs.existsSync(p))
        return p

    return null
}

// ToDo:
// - support server prefetch
// - support subscriptions handler

// Vue custom block loader that parse graphql tags and assign them to the component options
module.exports = createUnplugin(() => ({
    name: 'graphql',
    transformInclude (id) {
        return id.includes('.vue')
    },
    transform(code, id) {
        if(!id.includes('graphql'))
            return null

        const graph = gql(code)
        const attr = getAttributes(id)

        const query = graph.definitions.find((o) => o.operation === 'query')
        const mutation = graph.definitions.find((o) => o.operation === 'mutation')
        const subscription = graph.definitions.find((o) => o.operation === 'subscription')
        const fragments = graph.definitions.filter((o) => o.kind === 'FragmentDefinition')
        const documentPath = './document.js' // require.resolve('./document.js')
        const handler = 'test' // getHandlerPath(this.rootContext)

        code = `import Document from '${documentPath}'
            ${handler !== null ? `import Handler from '${handler}'` : 'var Handler = null'}

        export default function (options) {
            options.$gql = options.$gql || []
            options.mixins = options.mixins || []

            var attr       = ${JSON.stringify(attr)}
            var fragments  = ${JSON.stringify(fragments)}
            var mixin = {}
            options.mixins.push(mixin)

            options.$gql.push({
                attr: attr,
                fragments: fragments,
                query: ${query ? 'new Document(mixin, '+JSON.stringify(query)+', fragments, attr, Handler)' : 'null'},
                mutation: ${mutation ? 'new Document(mixin, '+JSON.stringify(mutation)+', fragments, attr, Handler)' : 'null'},
                subscription: ${subscription ? 'new Document(mixin, '+JSON.stringify(subscription)+', fragments, attr, Handler)' : 'null'},
            })
        }`

        return code
    }
}))