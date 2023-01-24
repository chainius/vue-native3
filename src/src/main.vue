<template>
    <view class="container">
        <text style="fontSize: 60">Vue3 App</text>
        <text>{{ JSON.stringify(test2) }}</text>
        <test  @click="justclick" style="fontSize: 60;color:red" :abdel="x" />
        <text>{{ x }}</text>
    </view>
</template>

 <script setup>
    import test from "./test.vue"
    import { ref } from 'vue'

    var test2 = defineProps({
        abdel : String
    })

    const x = ref('abdel')

    var t = 1
    setInterval(() => {
        x.value = 'abc' + t++
    }, 1000);


    function justclick(e){
      //  console.log("justclick", e)
    }
    //console.log("test file", test2.abdel)
    // var $filters = {
    //     testFunction(n, a, b) {
    //         console.log("testFunction")
    //         return 'hello ['+n+'] xx ' + a + ' => ' + b
    //     }
    // }

</script> 

<!-- <graphql>

    query {
        test
    }

</graphql> -->

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
