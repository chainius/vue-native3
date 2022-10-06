<template>
    <touchable @press="increment" style="backgroundColor: red">
        <text class="title">{{state.count}} second</text>
    </touchable>
</template>

<script setup>

    import { withHooks } from 'vue'
    import { useState } from 'react';

    var lastTimeout = null

    const state = withHooks(() => {
        const [ count, setCount ] = useState(0);

        clearTimeout(lastTimeout)
        lastTimeout = setTimeout(() => {
            setCount(count + 1);
        }, 10);

        return {
            count: 1000 + count,
        }
    })

</script>

<script>

    export default {
        name: 'lvl2',
        props: {
            title: {
                type: String,
                default: 'lvl2'
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
            console.log('lvl2 activated')
        },
        deactivated() {
            console.log('lvl2 deactivated')
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