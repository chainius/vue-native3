import React, { lazy, Suspense, useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import Test from './test.vue/index.vue'
import Lvl2 from './lvl2.vue/index.vue'
import { createApp, defineAsyncComponent } from 'vue'

// import Lvl1 from './lvl1.vue/index.vue'

const App =  createApp(Test)
// App.component('Lvl1', Lvl1)


// const Lvl1 = lazy(async function() {
//     await waitTimeout(2000)
//     return import('./comp1.js')
// });

const Lvl1 = defineAsyncComponent({
    loader: async function() {
        await waitTimeout(500)
        console.log('returning')
        return import('./comp1.js')
    },
    timeout: 2000,
    delay: 0,
    suspensible: false,
    loadingComponent: loading,
    errorComponent: onerror,
})

App.component('Lvl1', Lvl1)

export default App

// import { View, Text } from 'react-native'
// import { Suspense } from 'vue'

// // import Comp1 from './comp1.js'
// const Comp2 = lazy(async function() {
//     await waitTimeout(1000)
//     console.log('returning')
//     return import('./comp1.js')
// });

function loading() {
    return <View style={{ backgroundColor: 'black', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: "white"}}>loading...</Text>
    </View>
}

function onerror() {
    return <View style={{ backgroundColor: 'black', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: "white"}}>error...</Text>
    </View>
}

// function Testview() {
//     return <View style={{ backgroundColor: 'green', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
//         <Text style={{ color: "white"}}>test view.</Text>
//     </View>
// }

// // console.log('test', Comp1)

// export default function() {
//     // const deviceOrientation = useDeviceOrientation();
//     // console.log('upper', deviceOrientation)

//     return <Test style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
//     // return (<View style={{ flex: 1 }}>
//     //     <Comp1 />
//     //     <Suspense  fallback={loading()}>
//     //         <Comp1 />
//     //     </Suspense>
//     // </View>)
// }

// // export default function() {
// //     return <Suspense fallback={loading()}>
// //         <Comp1 />
// //     </Suspense>
// // }

function waitTimeout(timeout) {
    return new Promise(resolve => {
        setTimeout(resolve, timeout);
    });
}
