<template>
    <view class="text text2">
        <text>normal component</text>
        <!-- <button title="change" @press="item++" />

        <text style="color: #fff">test level {{ item % 2 }}</text> -->

        <suspense @pending="onPending" @fallback="onFallback" @resolve="onResolve">
            <lvl1 key="lvl1" class="text"><text>test.vue {{ i }} {{ color }}</text></lvl1>
            <text>inner suspensed text</text>

            <template #fallback>
               <text>Loading...</text>
            </template>
        </suspense>

        <!-- <lvl2 key="lvl2" class="text"><text>test.vue {{ item }}</text></lvl2> -->
    </view>
</template>


<script>

    // import Lvl1 from '../lvl1.vue/index.vue'
    import Lvl2 from '../lvl2.vue/index.vue'

    export default {
        components: {
            // Lvl1,
            Lvl2,
        },
        name: 'test-component',
        errorCaptured(e) {
            console.log('error captured from component', e)
        },
        data() {
            return {
                color: '#212121',
                item: 0,
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
        methods: {
            onPending() {
                console.log('pending process started')
            },
            onFallback() {
                console.log('showing fallback')
            },
            onResolve() {
                console.log('suspense resolved')
            }
        }
    }

</script>

<style>

    .text2 {
        flex: 1;
        width: 100%;
        justify-content: center;
        align-items: center;
        background-color: green;
    }

</style>