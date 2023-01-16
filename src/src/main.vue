<template>
    <view class="container">
        <text style="fontSize: 50">Vue3 App</text>
        <text style="fontSize: 50">{{ test | testFunction | myFn('test') }}</text>
    </view>
</template>

<!-- <script setup>

    var test = "lady"

    var $filters = {
        testFunction(n, a, b) {
            console.log("testFunction")
            return 'hello ['+n+'] xx ' + a + ' => ' + b
        }
    }

</script> -->


<script>

    // console.log(app)
    // console.log(test)
    
    export default {
        name: 'test'
    }

</script>

<style scoped>

    .container {
        flex: 1;
        justify-content: center;
        align-items: center;
    }

</style>
