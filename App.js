import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Test from './test.vue/index.vue'

class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            i: 0,
        }

        setInterval(() => {
            this.setState({
                i: this.state.i+1,
            })
        }, 1000)
        
    }

    render() {
        return (
            <View style={styles.container}>
                {/* <Text>Open up App.js to start working on your app!</Text> */}
                <Test onTest={(a, b, c) => console.log('test event received', a, b, c)} test={"counter " + this.state.i}  style={{ backgroundColor: 'black' }} />
                <StatusBar style="auto" />
            </View>
        )
    }
}

export default function(props) {
    return <App {...props} />
}

const styles = StyleSheet.create({
    container: {
        flex:            1,
        backgroundColor: '#fff',
        alignItems:      'center',
        justifyContent:  'center',
    },
})
