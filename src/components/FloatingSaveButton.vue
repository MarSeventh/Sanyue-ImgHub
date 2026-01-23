<template>
    <div 
        class="floating-save-btn" 
        :class="{ 'is-loading': loading }"
        @click="handleClick"
    >
        <font-awesome-icon v-if="loading" icon="spinner" spin />
        <font-awesome-icon v-else icon="save" />
        <span class="save-text">{{ loading ? '保存中' : '保存' }}</span>
    </div>
</template>

<script>
export default {
    name: 'FloatingSaveButton',
    props: {
        loading: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        handleClick() {
            if (!this.loading) {
                this.$emit('click');
            }
        }
    }
};
</script>

<style scoped>
.floating-save-btn {
    position: fixed;
    right: var(--floating-btn-right, 32px);
    bottom: var(--floating-btn-bottom, 32px);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 24px;
    background: var(--floating-btn-bg);
    color: var(--floating-btn-color);
    border-radius: 50px;
    cursor: pointer;
    box-shadow: var(--floating-btn-shadow);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    font-weight: 500;
    font-size: 15px;
    user-select: none;
}

.floating-save-btn:hover {
    transform: translateY(-3px);
    box-shadow: var(--floating-btn-shadow-hover);
}

.floating-save-btn:active {
    transform: translateY(-1px);
    box-shadow: var(--floating-btn-shadow);
}

.floating-save-btn.is-loading {
    cursor: not-allowed;
    opacity: 0.8;
}

.floating-save-btn.is-loading:hover {
    transform: none;
}

.floating-save-btn svg {
    font-size: 16px;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .floating-save-btn {
        right: 20px;
        bottom: 20px;
        padding: 12px 20px;
        font-size: 14px;
    }
    
    .floating-save-btn svg {
        font-size: 14px;
    }
}

@media (max-width: 480px) {
    .floating-save-btn {
        right: 16px;
        bottom: 16px;
        padding: 14px;
        border-radius: 50%;
    }
    
    .save-text {
        display: none;
    }
    
    .floating-save-btn svg {
        font-size: 18px;
    }
}
</style>
