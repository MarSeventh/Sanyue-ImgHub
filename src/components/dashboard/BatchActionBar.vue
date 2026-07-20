<template>
  <transition name="batch-toolbar">
    <div v-if="selectedCount > 0" class="batch-floating-bar">
      <el-tooltip :disabled="disableTooltip" :content="$t('dashboard.clearSelection')" placement="top">
        <el-button
          class="batch-floating-btn ghost"
          :aria-label="$t('dashboard.clearSelection')"
          @click="handleClear"
        >
          <font-awesome-icon icon="times" class="batch-floating-icon"></font-awesome-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip :disabled="disableTooltip" :content="`${selectedCount} ${$t('dashboard.selectedItems')}`" placement="top">
        <div class="batch-selection-summary">
          <span class="batch-selection-count">{{ selectedCount }}</span>
        </div>
      </el-tooltip>
      <span class="batch-toolbar-divider"></span>
      <div class="batch-floating-actions">
        <el-tooltip
          v-for="action in actions"
          :key="action.command"
          :disabled="disableTooltip"
          :content="$t(action.label)"
          placement="top"
        >
          <el-button
            class="batch-floating-btn"
            :class="action.className"
            :aria-label="$t(action.label)"
            @click="handleAction(action.command)"
          >
            <font-awesome-icon :icon="action.icon" class="batch-floating-icon"></font-awesome-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'BatchActionBar',
  props: {
    selectedCount: {
      type: Number,
      required: true
    }
  },
  emits: ['action', 'clear'],
  data() {
    return {
      actions: [
        { command: 'copy', label: 'dashboard.copy', icon: 'copy', className: 'copy' },
        { command: 'download', label: 'dashboard.download', icon: 'download', className: 'download' },
        { command: 'move', label: 'dashboard.move', icon: 'file-export', className: 'move' },
        { command: 'tagManagement', label: 'dashboard.tagManagement', icon: 'tags', className: 'tag' },
        { command: 'ban', label: 'dashboard.addToBlacklist', icon: 'ban', className: 'ban' },
        { command: 'white', label: 'dashboard.addToWhitelist', icon: 'shield-alt', className: 'white' },
        { command: 'delete', label: 'dashboard.delete', icon: 'trash-alt', className: 'danger' }
      ]
    }
  },
  computed: {
    disableTooltip() {
      return window.innerWidth < 768
    }
  },
  methods: {
    handleAction(command) {
      this.$emit('action', command)
    },
    handleClear() {
      this.$emit('clear')
    }
  }
}
</script>

<style scoped>
.batch-floating-bar {
  position: fixed;
  left: 50%;
  bottom: max(84px, calc(72px + env(safe-area-inset-bottom)));
  transform: translateX(-50%);
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: min(720px, calc(100vw - 48px));
  padding: 6px;
  border: 1px solid var(--admin-batch-toolbar-border);
  border-radius: 999px;
  background: var(--admin-batch-toolbar-bg);
  box-shadow: var(--admin-batch-toolbar-shadow);
}

.batch-selection-summary {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 0 2px;
}

.batch-selection-count {
  min-width: 18px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  color: var(--admin-batch-clear-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.batch-toolbar-divider {
  width: 1px;
  height: 16px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--admin-batch-toolbar-border);
  opacity: 0.58;
}

.batch-floating-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.batch-floating-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  margin-left: 0 !important;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: var(--admin-batch-clear-color);
  background: var(--admin-batch-action-bg);
  box-shadow: var(--admin-batch-action-shadow);
  transition: transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, color 0.22s ease;
}

.batch-floating-btn:hover {
  transform: none;
  background: var(--admin-batch-action-hover-bg);
  box-shadow: var(--admin-batch-action-hover-shadow);
}

.batch-floating-btn.danger {
  color: var(--admin-batch-delete-color);
}

.batch-floating-btn.tag {
  color: var(--admin-batch-tag-color);
}

.batch-floating-btn.ban,
.batch-floating-btn.white {
  color: var(--admin-batch-tag-color);
}

.batch-floating-btn.ghost {
  color: var(--admin-batch-clear-color);
}

.batch-floating-icon {
  width: 15px;
  margin-right: 0;
}

.batch-toolbar-enter-active,
.batch-toolbar-leave-active {
  transition: opacity 0.24s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.batch-toolbar-enter-from,
.batch-toolbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px) scale(0.99);
}

.batch-toolbar-enter-to,
.batch-toolbar-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

@media (max-width: 768px) {
  .batch-floating-bar {
    left: 50%;
    right: auto;
    bottom: max(76px, calc(64px + env(safe-area-inset-bottom)));
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100vw - 24px);
    gap: 4px;
    padding: 5px;
    border-radius: 999px;
  }

  .batch-selection-summary {
    padding: 0 1px;
  }

  .batch-selection-count {
    min-width: 16px;
    height: 22px;
    padding: 0 3px;
    font-size: 12px;
  }

  .batch-toolbar-divider {
    height: 14px;
  }

  .batch-floating-actions {
    flex: 1;
    min-width: 0;
    gap: 3px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    padding: 1px;
  }

  .batch-floating-actions::-webkit-scrollbar {
    display: none;
  }

  .batch-floating-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    padding: 0;
    border-radius: 50%;
  }

  .batch-floating-icon {
    margin-right: 0;
    width: 13px;
  }

  .batch-toolbar-enter-from,
  .batch-toolbar-leave-to {
    transform: translateX(-50%) translateY(12px) scale(0.99);
  }

  .batch-toolbar-enter-to,
  .batch-toolbar-leave-from {
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
</style>
