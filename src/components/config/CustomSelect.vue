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
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid #D9DCE2;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    box-sizing: border-box;
}
html.dark .custom-select-trigger {
    background: rgba(22, 22, 24, 0.75);
    border: 1px solid #34343A;
}

.custom-select-trigger:hover {
    background: rgba(255, 255, 255, 0.85);
    border-color: #BFC4CC;
}
html.dark .custom-select-trigger:hover {
    background: rgba(22, 22, 24, 0.88);
    border-color: #4A4A52;
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
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid #D9DCE2;
    border-radius: 8px;
    box-shadow: none;
    z-index: 2000;
    overflow: hidden;
}
html.dark .custom-select-dropdown {
    background: rgba(22, 22, 24, 0.9);
    border: 1px solid #34343A;
}

.custom-select-option {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    cursor: pointer;
    transition: background 0.2s ease;
}

.custom-select-option:hover {
    background: rgba(0, 0, 0, 0.04);
}
html.dark .custom-select-option:hover {
    background: rgba(255, 255, 255, 0.08);
}

.custom-select-option.is-selected {
    color: var(--el-color-primary);
    font-weight: 500;
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
