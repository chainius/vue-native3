<template>
    <view>
        <text>testing lvl1 {{ test }}</text>
        <slot name="abc" x="slot-x">
            <text>no slot found</text>
        </slot>
    </view>
</template>

<script>

    export default {
        name: 'lvl1',
        inject: {
            test: {
                default: 'x',
                from:    'foo',
            }
        }
    }

</script>