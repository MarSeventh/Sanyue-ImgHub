<template>
    <span
        class="dashboard-checkbox"
        :class="[
            `dashboard-checkbox--${variant}`,
            {
                'checked': checked,
                'indeterminate': indeterminate && !checked
            }
        ]"
        role="checkbox"
        :aria-checked="ariaChecked"
        tabindex="0"
        @click="handleClick"
        @keydown.enter.prevent="handleClick"
        @keydown.space.prevent="handleClick"
    >
        <font-awesome-icon :icon="markIcon" class="dashboard-checkbox-mark"></font-awesome-icon>
    </span>
</template>

<script>
export default {
    name: 'DashboardCheckbox',
    props: {
        checked: { type: Boolean, default: false },
        indeterminate: { type: Boolean, default: false },
        variant: {
            type: String,
            default: 'breadcrumb',
            validator: value => ['breadcrumb'].includes(value)
        }
    },
    emits: ['click'],
    computed: {
        ariaChecked() {
            if (this.checked) return 'true';
            if (this.indeterminate) return 'mixed';
            return 'false';
        },
        markIcon() {
            return this.indeterminate && !this.checked ? 'minus' : 'check';
        }
    },
    methods: {
        handleClick(event) {
            this.$emit('click', event);
        }
    }
}
</script>

<style scoped>
.dashboard-checkbox {
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.dashboard-checkbox--breadcrumb {
    position: relative;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    background: var(--glass-bg);
    box-shadow: none;
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.dashboard-checkbox--breadcrumb::before {
    content: "";
    position: absolute;
    inset: 7px;
    box-sizing: border-box;
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    background: transparent;
    transition: border-color 0.18s ease, background 0.18s ease;
}

.dashboard-checkbox--breadcrumb:hover {
    border-color: var(--glass-border-hover);
}

.dashboard-checkbox--breadcrumb:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--primary-color-accent) 42%, transparent);
}

.dashboard-checkbox--breadcrumb.checked,
.dashboard-checkbox--breadcrumb.indeterminate {
    border-color: var(--glass-border);
    background: var(--glass-bg);
}

.dashboard-checkbox--breadcrumb.checked::before,
.dashboard-checkbox--breadcrumb.indeterminate::before {
    border-color: rgba(255, 255, 255, 0.4);
    background: var(--primary-color);
}

.dashboard-checkbox-mark {
    position: relative;
    z-index: 1;
    width: 10px;
    height: 10px;
    opacity: 0;
    transform: scale(0.72);
    transition: opacity 0.16s ease, transform 0.16s ease;
}

.dashboard-checkbox.checked .dashboard-checkbox-mark,
.dashboard-checkbox.indeterminate .dashboard-checkbox-mark {
    opacity: 1;
    transform: scale(1);
}

.dashboard-checkbox--breadcrumb .dashboard-checkbox-mark {
    width: 11px;
    height: 11px;
}

@media (max-width: 768px) {
    .dashboard-checkbox--breadcrumb {
        width: 28px;
        height: 28px;
        border-radius: 8px;
    }

    .dashboard-checkbox--breadcrumb::before {
        inset: 6px;
    }

    .dashboard-checkbox--breadcrumb .dashboard-checkbox-mark {
        width: 10px;
        height: 10px;
    }
}
</style>
