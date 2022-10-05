import { lazy } from 'react'
import Test from './test.vue/index.vue'
import { createApp } from 'vue'
// import Lvl1 from './lvl1.vue/index.vue'

const App =  createApp(Test)
// App.component('Lvl1', Lvl1)


const Lvl1 = lazy(async function() {
    // await waitTimeout(500)
    return import('./comp1.js')
});

App.component('Lvl1', Lvl1)

export default App

// import React, { lazy } from 'react'
// import { View, Text } from 'react-native'
// import { Suspense } from 'vue'

// // import Comp1 from './comp1.js'
// const Comp1 = lazy(async function() {
//     await waitTimeout(1000)
//     console.log('returning')
//     return import('./comp1.js')
// });

// function loading() {
//     return <View style={{ backgroundColor: 'black', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
//         <Text style={{ color: "white"}}>loading...</Text>
//     </View>
// }

// console.log('test', Comp1)

// export default function() {
//     return <Suspense fallback={loading()}>
//         <Comp1 />
//     </Suspense>
// }

function waitTimeout(timeout) {
    return new Promise(resolve => {
        setTimeout(resolve, timeout);
    });
}