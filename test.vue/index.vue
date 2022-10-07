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

<style>

    .text2 {
        flex: 1;
        width: 100%;
        justify-content: center;
        align-items: center;
        background-color: green;
    }

</style>