<template>
    <span class="ai-icon" aria-hidden="true">
        <svg viewBox="0 0 36 32" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 23 9.5 9Q11 5.5 12.5 9L18 23M6.5 17.5H15.5" />
                <path d="M23 8.5H31.5M27.25 8.5V23.5M23 23.5H31.5" />
            </g>
        </svg>
    </span>
</template>

<script>
export default {
    name: 'AIIcon',
};
</script>

<style scoped>
.ai-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1em;
    height: 1.1em;
    flex-shrink: 0;
    color: inherit;
    line-height: 1;
    vertical-align: middle;
}

.ai-icon > svg {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
