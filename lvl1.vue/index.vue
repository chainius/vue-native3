<template>
    <touchable @press="increment" style="backgroundColor: blue">
        <text class="title">{{title}} first</text>
        <text class="value">{{ i }}</text>
    </touchable>
</template>

<script setup>

    import { nextTick } from 'vue'

    await nextTick()

    console.log('next tick reached')

</script>

<script>

    export default {
        name: 'lvl1',
        props: {
            title: {
                type: String,
                default: 'lvl1'
            }
        },
        data() {
            return {
                i: 0
            }
        },
        methods: {
            increment() {
                this.i++
            }
        },
        activated() {
            console.log('lvl1 activated')
        },
        deactivated() {
            console.log('lvl1 deactivated')
        }
    }

</script>

<style scoped>

    .title {
        color: #fff;
        fontSize: 25px;
        marginBottom: 15px;
    }

    .value {
        color: #fff;
        fontSize: 20px;
    }

</style>