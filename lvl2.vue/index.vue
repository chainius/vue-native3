<template>
    <touchable @press="increment" style="backgroundColor: red">
        <text class="title">{{title}} second</text>
        <text class="value">{{ i }}</text>
    </touchable>
</template>

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