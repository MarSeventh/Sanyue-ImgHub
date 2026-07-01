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
        <font-awesome-icon v-if="checked" icon="check" class="dashboard-checkbox-mark"></font-awesome-icon>
        <font-awesome-icon v-else-if="indeterminate" icon="minus" class="dashboard-checkbox-mark"></font-awesome-icon>
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
            default: 'list',
            validator: value => ['list', 'breadcrumb'].includes(value)
        }
    },
    emits: ['click'],
    computed: {
        ariaChecked() {
            if (this.checked) return 'true';
            if (this.indeterminate) return 'mixed';
            return 'false';
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

.dashboard-checkbox--list {
    width: 18px;
    height: 18px;
    border: 2px solid var(--el-border-color);
    border-radius: 4px;
    background: transparent;
}

.dashboard-checkbox--list:hover {
    border-color: #38bdf8;
}

.dashboard-checkbox--list:focus-visible {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14);
}

.dashboard-checkbox--list.checked,
.dashboard-checkbox--list.indeterminate {
    border-color: #38bdf8;
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
}

.dashboard-checkbox--breadcrumb {
    position: relative;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background: var(--el-fill-color-light);
    box-shadow: var(--admin-dashboard-stats-shadow);
    backdrop-filter: blur(12px) saturate(140%);
}

.dashboard-checkbox--breadcrumb::before {
    content: "";
    position: absolute;
    inset: 7px;
    box-sizing: border-box;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    transition: border-color 0.18s ease, background 0.18s ease;
}

.dashboard-checkbox--breadcrumb:hover {
    border-color: rgba(56, 189, 248, 0.24);
    background: var(--el-fill-color-lighter);
    box-shadow: var(--admin-dashboard-stats-hover-shadow);
}

.dashboard-checkbox--breadcrumb:focus-visible {
    outline: none;
    border-color: rgba(56, 189, 248, 0.34);
    box-shadow: var(--admin-dashboard-stats-hover-shadow);
}

.dashboard-checkbox--breadcrumb.checked,
.dashboard-checkbox--breadcrumb.indeterminate {
    border-color: rgba(56, 189, 248, 0.34);
    background: var(--el-fill-color-light);
    box-shadow: var(--admin-dashboard-stats-shadow);
}

.dashboard-checkbox--breadcrumb.checked::before,
.dashboard-checkbox--breadcrumb.indeterminate::before {
    border-color: rgba(255, 255, 255, 0.4);
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
}

.dashboard-checkbox-mark {
    position: relative;
    z-index: 1;
    width: 10px;
    height: 10px;
}

.dashboard-checkbox--breadcrumb .dashboard-checkbox-mark {
    width: 11px;
    height: 11px;
}

@media (max-width: 768px) {
    .dashboard-checkbox--list {
        width: 16px;
        height: 16px;
        border-width: 1.5px;
    }

    .dashboard-checkbox--list .dashboard-checkbox-mark {
        width: 9px;
        height: 9px;
    }

    .dashboard-checkbox--breadcrumb {
        width: 28px;
        height: 28px;
        border-radius: 8px;
    }

    .dashboard-checkbox--breadcrumb::before {
        inset: 6px;
        border-radius: 5px;
    }

    .dashboard-checkbox--breadcrumb .dashboard-checkbox-mark {
        width: 10px;
        height: 10px;
    }
}
</style>
