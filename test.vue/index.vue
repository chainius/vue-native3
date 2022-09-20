<template>
    <view class="text text2">
        <button title="change" @press="item++" />

        <text style="color: #fff">test level {{ item % 2 }}</text>

        <KeepAlive>
            <lvl1 v-if="item % 2 == 0" key="lvl1" class="text"><text>test.vue {{ i }} {{ color }}</text></lvl1>
            <lvl2 v-else class="text" key="lvl2"><text>test.vue {{ item }}</text></lvl2>
        </KeepAlive>
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
    }

</script>

<style>

    .text2 {
        flex: 1;
        width: 100%;
        justify-content: center;
        align-items: center;
        backgroundColor: green;
    }

</style>