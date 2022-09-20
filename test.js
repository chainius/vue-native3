const transform = require('./compiler')
const fs = require('fs')

const data = fs.readFileSync('./test.vue/index.vue').toString()

const app = transform(data)

fs.writeFileSync("./test.vue/script.js", app.script)

console.log('vue file compiled')
