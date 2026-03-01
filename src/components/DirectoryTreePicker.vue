<template>
    <div class="directory-tree-picker">
        <!-- 桌面端 Popover 模式 -->
        <el-popover
            v-if="isDesktop"
            v-model:visible="popoverVisible"
            placement="bottom-start"
            :width="320"
            trigger="click"
            popper-class="directory-tree-popover"
            :show-arrow="true"
            :hide-after="0"
            :show-after="50"
            transition="el-zoom-in-top"
        >
            <template #reference>
                <span class="popover-trigger-wrapper" @click.stop>
                    <slot name="trigger"></slot>
                </span>
            </template>
            <div class="tree-container" v-loading="loading">
                <div v-if="error" class="error-state">
                    <font-awesome-icon icon="exclamation-circle" class="error-icon" />
                    <span class="error-text">{{ error }}</span>
                    <el-button type="primary" size="small" @click="fetchDirectoryTree">
                        重试
                    </el-button>
                </div>
                <el-tree
                    v-else
                    ref="treeRef"
                    :data="treeData"
                    :props="treeProps"
                    node-key="path"
                    :default-expand-all="false"
                    :expand-on-click-node="false"
                    :highlight-current="true"
                    :current-node-key="currentDirectory"
                    class="directory-tree"
                    @node-click="handleNodeClick"
                >
                    <template #default="{ node, data }">
                        <span class="tree-node" :class="{ 'is-current': data.path === currentDirectory }">
                            <font-awesome-icon :icon="node.expanded ? 'folder-open' : 'folder'" class="folder-icon" />
                            <span class="node-label">{{ data.name }}</span>
                        </span>
                    </template>
                </el-tree>
            </div>
        </el-popover>

        <!-- 移动端 Drawer 模式 -->
        <template v-else>
            <span class="drawer-trigger-wrapper" @click="openDrawer">
                <slot name="trigger"></slot>
            </span>
            <el-drawer
                v-model="drawerVisible"
                direction="btt"
                size="60%"
                :show-close="true"
                :with-header="true"
                :z-index="3000"
                title="选择目录"
                class="directory-tree-drawer"
            >
                <div class="tree-container" v-loading="loading">
                    <div v-if="error" class="error-state">
                        <font-awesome-icon icon="exclamation-circle" class="error-icon" />
                        <span class="error-text">{{ error }}</span>
                        <el-button type="primary" size="small" @click="fetchDirectoryTree">
                            重试
                        </el-button>
                    </div>
                    <el-tree
                        v-else
                        ref="treeRefMobile"
                        :data="treeData"
                        :props="treeProps"
                        node-key="path"
                        :default-expand-all="false"
                        :expand-on-click-node="false"
                        :highlight-current="true"
                        :current-node-key="currentDirectory"
                        class="directory-tree mobile-tree"
                        @node-click="handleNodeClick"
                    >
                        <template #default="{ node, data }">
                            <span class="tree-node" :class="{ 'is-current': data.path === currentDirectory }">
                                <font-awesome-icon :icon="node.expanded ? 'folder-open' : 'folder'" class="folder-icon" />
                                <span class="node-label">{{ data.name }}</span>
                            </span>
                        </template>
                    </el-tree>
                </div>
            </el-drawer>
        </template>
    </div>
</template>

<script>
import axios from '@/utils/axios';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default {
    name: 'DirectoryTreePicker',
    props: {
        currentDirectory: {
            type: String,
            default: ''
        },
        source: {
            type: String,
            default: 'upload',
            validator: (value) => ['upload', 'admin'].includes(value)
        }
    },
    data() {
        return {
            popoverVisible: false,
            drawerVisible: false,
            treeData: [],
            loading: false,
            error: '',
            treeProps: {
                children: 'children',
                label: 'name'
            },
            windowWidth: window.innerWidth
        };
    },
    computed: {
        isDesktop() {
            return this.windowWidth >= 769;
        }
    },
    watch: {
        popoverVisible(newVal) {
            if (newVal) {
                this.fetchDirectoryTree();
            }
        },
        drawerVisible(newVal) {
            if (newVal) {
                this.fetchDirectoryTree();
            }
        },
        currentDirectory(newVal) {
            this.$nextTick(() => {
                if (this.$refs.treeRef && newVal) {
                    this.$refs.treeRef.setCurrentKey(newVal);
                }
                if (this.$refs.treeRefMobile && newVal) {
                    this.$refs.treeRefMobile.setCurrentKey(newVal);
                }
            });
        }
    },
    mounted() {
        window.addEventListener('resize', this.handleResize);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.handleResize);
    },
    methods: {
        handleResize() {
            this.windowWidth = window.innerWidth;
        },
        openDrawer() {
            this.drawerVisible = true;
        },
        async fetchDirectoryTree() {
            this.loading = true;
            this.error = '';

            try {
                let data;
                
                if (this.source === 'admin') {
                    const response = await fetchWithAuth('/api/directoryTree', {
                        method: 'GET'
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.error = '认证失败，请重新登录';
                        } else {
                            this.error = '服务器错误，请稍后重试';
                        }
                        return;
                    }
                    data = await response.json();
                } else {
                    const response = await axios.get('/api/directoryTree', {
                        withAuthCode: true
                    });
                    data = response.data;
                }

                if (data.tree) {
                    this.treeData = [data.tree];
                } else {
                    this.treeData = [];
                }
            } catch (err) {
                console.error('Failed to fetch directory tree:', err);
                if (err.response?.status === 401) {
                    this.error = '认证失败，请重新登录';
                } else {
                    this.error = '加载目录树失败，请检查网络连接';
                }
            } finally {
                this.loading = false;
            }
        },
        handleNodeClick(data) {
            let path = data.path;
            if (path && !path.startsWith('/')) {
                path = '/' + path;
            } else if (!path) {
                path = '/';
            }
            this.$emit('select', path);
            this.popoverVisible = false;
            this.drawerVisible = false;
        }
    }
};
</script>

<style scoped>
.directory-tree-picker {
    display: inline-block;
}

.popover-trigger-wrapper,
.drawer-trigger-wrapper {
    display: inline-block;
}

.tree-container {
    min-height: 200px;
    max-height: 400px;
    overflow-y: auto;
    padding: 8px;
}

.directory-tree {
    background: transparent;
    --el-tree-node-hover-bg-color: var(--el-fill-color-light);
}

.directory-tree :deep(.el-tree-node__content) {
    height: 44px;
    padding: 0 8px;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.directory-tree :deep(.el-tree-node__content:hover) {
    background-color: var(--el-fill-color-light);
}

.directory-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background-color: var(--el-color-primary-light-9);
}

.tree-node {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    width: 100%;
    min-height: 36px;
}

.tree-node.is-current {
    color: var(--el-color-primary);
    font-weight: 500;
}

.folder-icon {
    color: var(--el-color-warning);
    font-size: 16px;
    flex-shrink: 0;
}

.node-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mobile-tree :deep(.el-tree-node__content) {
    height: 48px;
    padding: 0 12px;
}

.mobile-tree .tree-node {
    min-height: 40px;
}

.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
}

.error-icon {
    font-size: 32px;
    color: var(--el-color-danger);
}

.error-text {
    color: var(--el-text-color-secondary);
    font-size: 14px;
}

.tree-container :deep(.el-loading-mask) {
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
}
</style>

<style>
.directory-tree-popover {
    padding: 0 !important;
    border-radius: 12px !important;
    box-shadow: var(--el-box-shadow-light) !important;
}

/* 加速 popover 动画 */
.el-zoom-in-top-enter-active.directory-tree-popover,
.el-zoom-in-top-leave-active.directory-tree-popover {
    transition: transform 0.15s ease-out, opacity 0.15s ease-out !important;
}

.directory-tree-drawer {
    border-radius: 16px 16px 0 0 !important;
}

.directory-tree-drawer .el-drawer__header {
    margin-bottom: 0;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.directory-tree-drawer .el-drawer__body {
    padding: 0;
}
</style>
