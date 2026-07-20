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
    border: 2px solid #D9DCE2;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.72);
}
html.dark .dashboard-checkbox--list {
    border-color: #34343A;
    background: rgba(22, 22, 24, 0.75);
}

.dashboard-checkbox--list:hover {
    border-color: #38bdf8;
    background: rgba(255, 255, 255, 0.85);
}
html.dark .dashboard-checkbox--list:hover {
    background: rgba(22, 22, 24, 0.88);
}

.dashboard-checkbox--list:focus-visible {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14);
}

.dashboard-checkbox--list.checked,
.dashboard-checkbox--list.indeterminate {
    border-color: #38bdf8;
    background: #0ea5e9;
}

.dashboard-checkbox--breadcrumb {
    position: relative;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border: 1px solid #D9DCE2;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: none;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}
html.dark .dashboard-checkbox--breadcrumb {
    border: 1px solid #34343A;
    background: rgba(22, 22, 24, 0.75);
}

.dashboard-checkbox--breadcrumb::before {
    content: "";
    position: absolute;
    inset: 7px;
    box-sizing: border-box;
    border: 1px solid #D9DCE2;
    border-radius: 5px;
    background: transparent;
    transition: border-color 0.18s ease, background 0.18s ease;
}
html.dark .dashboard-checkbox--breadcrumb::before {
    border-color: #34343A;
}

.dashboard-checkbox--breadcrumb:hover {
    border-color: #BFC4CC;
    background: rgba(255, 255, 255, 0.85);
}
html.dark .dashboard-checkbox--breadcrumb:hover {
    border-color: #4A4A52;
    background: rgba(22, 22, 24, 0.88);
}

.dashboard-checkbox--breadcrumb:focus-visible {
    outline: none;
    border-color: rgba(56, 189, 248, 0.34);
}

.dashboard-checkbox--breadcrumb.checked,
.dashboard-checkbox--breadcrumb.indeterminate {
    border-color: #D9DCE2;
    background: rgba(255, 255, 255, 0.72);
}
html.dark .dashboard-checkbox--breadcrumb.checked,
html.dark .dashboard-checkbox--breadcrumb.indeterminate {
    border-color: #34343A;
    background: rgba(22, 22, 24, 0.75);
}

.dashboard-checkbox--breadcrumb.checked::before,
.dashboard-checkbox--breadcrumb.indeterminate::before {
    border-color: rgba(255, 255, 255, 0.4);
    background: #0ea5e9;
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
