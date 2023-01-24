<template>
  <view>
    <text>{{$attrs}}</text>

    
    <!-- <text v-bind="$props">this is the prop {{ test2.abdel }}</text> -->
    <text v-bind="$props" >this is the prop {{ abdel }}</text>
  </view>
</template>

<script setup>
 
    var emit = defineEmits(["click"])
    emit("click", "first")
    setTimeout(() => {
        emit("click", "voila")
    },5000);
    //console.log(test2.style)
</script>