import Test from './test.vue/index.vue'
import { createApp } from 'vue'
import Lvl1 from './lvl1.vue/index.vue'

const App =  createApp(Test)
App.component('Lvl1', Lvl1)

export default App