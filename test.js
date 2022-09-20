const transform = require('./compiler')
const fs = require('fs')

var file = 'test.vue'
const data = fs.readFileSync('./'+file+'/index.vue').toString()

const app = transform(data)

fs.writeFileSync('./'+file+'/script.js', app.script)

console.log('vue file compiled')
