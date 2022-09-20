<template>
    <view class="text text2">
        <text v-show="b">
                test.vue {{ i }}
        </text>
        <view v-model.lazy="color" />
        <text ref="test" class="text">test.vue {{ i }} {{ color }}</text>

        <lvl1>
            <text>inner slot</text>
        </lvl1>

        <Test />
    </view>
</template>


<script setup>

    import Lvl1 from '../lvl1.vue/index.vue'
    import Test from './test.js'
    import { ref } from 'vue'

    const i = ref(0)
    const b = ref(0)

    setInterval(() => {
        i.value++

        if(i.value % 2 == 0)
            b.value++
    }, 1000)

    const theme = {
        color: 'white'
    }

</script>


<script>

    export default {
        name: 'test-component',
        data() {
            return {
                color: '#212121'
            }
        },
        mounted() {
            var i = 0 
            var colors = [
                'blue',
                'purple',
                'black',
                'red',
            ]

            setInterval(() => {
                i++
                this.color = colors[i%colors.length]
            }, 1000)
        },
    }

</script>

<style>
    .text {
        backgroundColor: v-bind(color);
        color: v-bind(theme.color);
    }

    .text2 {
        flex: 1;
        width: 100%;
        justify-content: center;
        align-items: center;
        backgroundColor: green;
    }
</style>