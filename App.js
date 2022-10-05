import React, { lazy, Suspense, useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import Test from './test.vue/index.vue'
import { createApp, defineAsyncComponent } from 'vue'
// import Lvl1 from './lvl1.vue/index.vue'

// const App =  createApp(Test)
// App.component('Lvl1', Lvl1)


// const Lvl1 = lazy(async function() {
//     await waitTimeout(2000)
//     return import('./comp1.js')
// });

// App.component('Lvl1', Lvl1)

// export default App

// import { View, Text } from 'react-native'
// import { Suspense } from 'vue'

// // import Comp1 from './comp1.js'
const Comp2 = lazy(async function() {
    await waitTimeout(1000)
    console.log('returning')
    return import('./comp1.js')
});

const Comp1 = defineAsyncComponent({
    loader: async function() {
        await waitTimeout(1000)
        console.log('returning')
        throw('test')
        return import('./comp1.js')
    },
    delay: 0,
    loadingComponent: loading,
    errorComponent: onerror,
})

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

function Testview() {
    return <View style={{ backgroundColor: 'green', flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: "white"}}>test view.</Text>
    </View>
}

// console.log('test', Comp1)

export default function() {
    return (<View style={{ flex: 1 }}>
        <Comp1 />
        <Suspense  fallback={loading()}>
            <Comp1 />
        </Suspense>
    </View>)
}

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
