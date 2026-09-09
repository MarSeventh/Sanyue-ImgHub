<template>
    <div class="custom-select" :class="{ 'is-open': isOpen }" :style="{ width: width }">
        <div class="custom-select-trigger" @click="toggleDropdown">
            <span class="custom-select-value" :class="{ 'is-placeholder': !modelValue }">
                {{ displayLabel }}
            </span>
            <font-awesome-icon icon="chevron-down" class="custom-select-arrow" />
        </div>
        <transition name="dropdown-fade">
            <div class="custom-select-dropdown" v-show="isOpen" @click.stop>
                <div 
                    v-for="option in options" 
                    :key="option.value"
                    class="custom-select-option"
                    :class="{ 'is-selected': modelValue === option.value }"
                    @click="selectOption(option.value)"
                >
                    <slot name="option" :option="option">
                        <ChannelIcon v-if="option.channelType" :type="option.channelType" :class="['option-icon', option.iconClass]"/>
                        <font-awesome-icon v-else-if="option.icon" :icon="option.icon" :class="['option-icon', option.iconClass]"/>
                        <span>{{ option.label }}</span>
                    </slot>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import ChannelIcon from '@/components/icons/ChannelIcon.vue';

export default {
    name: 'CustomSelect',
    components: {
        ChannelIcon
    },
    props: {
        modelValue: {
            type: [String, Number],
            default: ''
        },
        options: {
            type: Array,
            required: true,
            // 格式: [{ value: '', label: '', icon?: '', iconClass?: '', channelType?: '' }]
        },
        placeholder: {
            type: String,
            default: ''
        },
        width: {
            type: String,
            default: '160px'
        }
    },
    emits: ['update:modelValue', 'change'],
    data() {
        return {
            isOpen: false
        };
    },
    computed: {
        resolvedPlaceholder() {
            return this.placeholder || this.$t('common.select');
        },
        displayLabel() {
            const selected = this.options.find(opt => opt.value === this.modelValue);
            return selected ? selected.label : this.resolvedPlaceholder;
        }
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    },
    methods: {
        toggleDropdown() {
            this.isOpen = !this.isOpen;
        },
        selectOption(value) {
            this.$emit('update:modelValue', value);
            this.$emit('change', value);
            this.isOpen = false;
        },
        handleClickOutside(e) {
            if (!this.$el.contains(e.target)) {
                this.isOpen = false;
            }
        }
    }
};
</script>

<style scoped>
.custom-select {
    position: relative;
}

.custom-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 12px;
    background: color-mix(in srgb, var(--el-fill-color-blank) 72%, transparent);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    box-sizing: border-box;
}
html.dark .custom-select-trigger {
    background: color-mix(in srgb, var(--el-bg-color) 75%, transparent);
}

.custom-select-trigger:hover {
    background: color-mix(in srgb, var(--el-fill-color-blank) 85%, transparent);
    border-color: var(--glass-border-hover);
}
html.dark .custom-select-trigger:hover {
    background: color-mix(in srgb, var(--el-bg-color) 88%, transparent);
    border-color: var(--glass-border-hover);
}

.custom-select.is-open .custom-select-trigger {
    border-color: var(--el-color-primary);
}

.custom-select-value {
    font-size: 14px;
    color: var(--el-text-color-regular);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.custom-select-value.is-placeholder {
    color: var(--el-text-color-placeholder);
}

.custom-select-arrow {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    transition: transform 0.2s ease;
    flex-shrink: 0;
    margin-left: 8px;
}

.custom-select.is-open .custom-select-arrow {
    transform: rotate(180deg);
}

.custom-select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 4px;
    background: var(--popper-bg-color);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    box-shadow: var(--popper-shadow);
    z-index: 2000;
    max-height: 280px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.custom-select-option {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 6px;
    background: transparent;
    font-size: 14px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.custom-select-option.is-selected {
    color: var(--primary-color-accent);
    font-weight: 600;
}

.custom-select-option:hover {
    background-color: color-mix(in srgb, var(--el-text-color-primary) 10%, transparent);
    color: var(--el-text-color-primary);
}
html.dark .custom-select-option:hover {
    background-color: color-mix(in srgb, var(--el-text-color-primary) 8%, transparent);
    color: var(--el-text-color-primary);
}

.option-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

/* 下拉框动画 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
