<template>
    <touchable @press="increment" style="backgroundColor: red; flex: 1; width: 100%; justifyContent: center; alignItems: center">
        <text class="title">vue binding</text>
    </touchable>
</template>

<script>

    export default {
        name: 'lvl2',
        // async: true,
        beforeCreate() {
            console.log('before create')
        },
        created() {
            console.log('created')
        },
        mounted() {
            console.log('mounted')
        },
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
        color: #000;
        fontSize: 25px;
        marginBottom: 15px;
    }

    .value {
        color: #fff;
        fontSize: 20px;
    }

</style>