<template>
  <transition name="batch-toolbar">
    <div v-if="selectedCount > 0" class="batch-floating-bar">
      <el-tooltip :content="`${selectedCount} ${$t('dashboard.selectedItems')}`" placement="top">
        <div class="batch-selection-summary">
          <span class="batch-selection-count">{{ selectedCount }}</span>
        </div>
      </el-tooltip>
      <div class="batch-floating-actions">
        <el-tooltip
          v-for="action in actions"
          :key="action.command"
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
        <el-tooltip :content="$t('dashboard.clearSelection')" placement="top">
          <el-button
            class="batch-floating-btn ghost"
            :aria-label="$t('dashboard.clearSelection')"
            @click="handleClear"
          >
            <font-awesome-icon icon="times" class="batch-floating-icon"></font-awesome-icon>
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
  gap: 8px;
  max-width: min(720px, calc(100vw - 48px));
  padding: 8px;
  border: 1px solid var(--admin-batch-toolbar-border);
  border-radius: 999px;
  background: var(--admin-batch-toolbar-bg);
  box-shadow: var(--admin-batch-toolbar-shadow);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.batch-selection-summary {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 0;
}

.batch-selection-count {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--admin-batch-count-color);
  font-weight: 700;
  background: var(--admin-batch-count-bg);
  box-shadow: var(--admin-batch-count-shadow);
}

.batch-floating-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.batch-floating-btn {
  width: 38px;
  height: 38px;
  min-width: 38px;
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
  transform: translateY(-2px);
  background: var(--admin-batch-action-hover-bg);
  box-shadow: var(--admin-batch-action-hover-shadow);
}

.batch-floating-btn.copy {
  color: var(--admin-batch-copy-color);
}

.batch-floating-btn.danger {
  color: var(--admin-batch-delete-color);
}

.batch-floating-btn.download {
  color: var(--admin-batch-download-color);
}

.batch-floating-btn.move {
  color: var(--admin-batch-move-color);
}

.batch-floating-btn.tag {
  color: var(--admin-batch-tag-color);
}

.batch-floating-btn.ban {
  color: var(--admin-batch-ban-color);
}

.batch-floating-btn.white {
  color: var(--admin-batch-white-color);
}

.batch-floating-btn.ghost {
  color: var(--admin-batch-clear-color);
}

.batch-floating-icon {
  width: 16px;
  margin-right: 0;
}

.batch-toolbar-enter-active,
.batch-toolbar-leave-active {
  transition: opacity 0.24s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.batch-toolbar-enter-from,
.batch-toolbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px) scale(0.98);
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
    gap: 6px;
    padding: 7px;
    border-radius: 999px;
  }

  .batch-selection-summary {
    padding: 0;
  }

  .batch-selection-count {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-size: 13px;
  }

  .batch-floating-actions {
    flex: 1;
    min-width: 0;
    gap: 5px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    padding: 1px;
  }

  .batch-floating-actions::-webkit-scrollbar {
    display: none;
  }

  .batch-floating-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    padding: 0;
    border-radius: 50%;
  }

  .batch-floating-icon {
    margin-right: 0;
    width: 14px;
  }

  .batch-toolbar-enter-from,
  .batch-toolbar-leave-to {
    transform: translateX(-50%) translateY(16px) scale(0.98);
  }

  .batch-toolbar-enter-to,
  .batch-toolbar-leave-from {
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
</style>
