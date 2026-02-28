<template>
    <div class="move-file-dialog-wrapper">
        <!-- 桌面端使用 Dialog -->
        <el-dialog
            v-if="isDesktop"
            v-model="dialogVisible"
            :title="isBatchMove ? '批量移动文件' : '移动文件'"
            width="500px"
            :show-close="true"
            class="move-dialog"
            @close="handleClose"
        >
            <div class="move-dialog-content">
                <div class="move-path-input-container">
                    <el-input
                        v-model="targetPath"
                        placeholder="请输入目标目录路径"
                        class="move-path-input"
                    >
                        <template #prepend>目标目录</template>
                    </el-input>
                    <DirectoryTreePicker
                        :current-directory="currentDirectory"
                        source="admin"
                        @select="handleDirectorySelect"
                    >
                        <template #trigger>
                            <el-button class="directory-picker-trigger">
                                <font-awesome-icon icon="folder-tree" />
                            </el-button>
                        </template>
                    </DirectoryTreePicker>
                </div>
                <p class="move-dialog-hint">提示：路径以 / 开头表示根目录，如 /photos/2024/</p>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="handleClose">取消</el-button>
                    <el-button type="primary" :loading="loading" @click="handleConfirm">确定</el-button>
                </span>
            </template>
        </el-dialog>

        <!-- 移动端使用 Drawer -->
        <el-drawer
            v-else
            v-model="dialogVisible"
            :title="isBatchMove ? '批量移动文件' : '移动文件'"
            direction="btt"
            size="auto"
            :show-close="true"
            class="move-drawer"
            @close="handleClose"
        >
            <div class="move-drawer-content">
                <div class="move-path-section">
                    <div class="move-path-label">目标目录</div>
                    <div class="move-path-input-row">
                        <el-input
                            v-model="targetPath"
                            placeholder="请输入目标目录路径"
                            class="move-path-input"
                        />
                        <el-button class="directory-picker-trigger" @click="showTreePicker = true">
                            <font-awesome-icon icon="folder-tree" />
                        </el-button>
                    </div>
                    <p class="move-dialog-hint">提示：路径以 / 开头表示根目录</p>
                </div>
                
                <!-- 内嵌目录树 -->
                <div v-if="showTreePicker" class="embedded-tree-section">
                    <div class="tree-section-header">
                        <span class="tree-section-title">选择目录</span>
                        <el-button text @click="showTreePicker = false">
                            <font-awesome-icon icon="times" />
                        </el-button>
                    </div>
                    <div class="tree-container" v-loading="treeLoading">
                        <div v-if="treeError" class="error-state">
                            <font-awesome-icon icon="exclamation-circle" class="error-icon" />
                            <span class="error-text">{{ treeError }}</span>
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
                            @node-click="handleTreeNodeClick"
                        >
                            <template #default="{ node, data }">
                                <span class="tree-node" :class="{ 'is-current': data.path === currentDirectory }">
                                    <font-awesome-icon :icon="node.expanded ? 'folder-open' : 'folder'" class="folder-icon" />
                                    <span class="node-label">{{ data.name }}</span>
                                </span>
                            </template>
                        </el-tree>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="drawer-footer">
                    <el-button @click="handleClose" class="footer-btn">取消</el-button>
                    <el-button type="primary" :loading="loading" @click="handleConfirm" class="footer-btn">确定</el-button>
                </div>
            </template>
        </el-drawer>
    </div>
</template>

<script>
import DirectoryTreePicker from '@/components/DirectoryTreePicker.vue';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default {
    name: 'MoveFileDialog',
    components: {
        DirectoryTreePicker
    },
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        currentDirectory: {
            type: String,
            default: ''
        },
        isBatchMove: {
            type: Boolean,
            default: false
        },
        initialPath: {
            type: String,
            default: '/'
        }
    },
    emits: ['update:modelValue', 'confirm', 'close'],
    data() {
        return {
            targetPath: '/',
            loading: false,
            windowWidth: window.innerWidth,
            // 移动端内嵌树相关
            showTreePicker: false,
            treeData: [],
            treeLoading: false,
            treeError: '',
            treeProps: {
                children: 'children',
                label: 'name'
            }
        };
    },
    computed: {
        dialogVisible: {
            get() {
                return this.modelValue;
            },
            set(val) {
                this.$emit('update:modelValue', val);
            }
        },
        isDesktop() {
            return this.windowWidth > 768;
        }
    },
    watch: {
        modelValue(newVal) {
            if (newVal) {
                this.targetPath = this.initialPath || '/';
                this.showTreePicker = false;
            }
        },
        showTreePicker(newVal) {
            if (newVal && !this.isDesktop) {
                this.fetchDirectoryTree();
            }
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
        handleDirectorySelect(path) {
            this.targetPath = path;
        },
        handleConfirm() {
            this.$emit('confirm', this.targetPath);
        },
        handleClose() {
            this.$emit('update:modelValue', false);
            this.$emit('close');
        },
        // 移动端内嵌树相关方法
        async fetchDirectoryTree() {
            this.treeLoading = true;
            this.treeError = '';

            try {
                const response = await fetchWithAuth('/api/directoryTree', {
                    method: 'GET'
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        this.treeError = '认证失败，请重新登录';
                    } else {
                        this.treeError = '服务器错误，请稍后重试';
                    }
                    return;
                }
                const data = await response.json();

                if (data.tree) {
                    this.treeData = [data.tree];
                } else {
                    this.treeData = [];
                }
            } catch (err) {
                console.error('Failed to fetch directory tree:', err);
                this.treeError = '加载目录树失败，请检查网络连接';
            } finally {
                this.treeLoading = false;
            }
        },
        handleTreeNodeClick(data) {
            let path = data.path;
            if (path && !path.startsWith('/')) {
                path = '/' + path;
            } else if (!path) {
                path = '/';
            }
            this.targetPath = path;
            this.showTreePicker = false;
        }
    }
};
</script>

<style scoped>
.move-dialog-content {
    padding: 0 10px;
}

.move-path-input-container {
    display: flex;
    align-items: center;
    gap: 10px;
}

.move-path-input {
    flex: 1;
}

.directory-picker-trigger {
    flex-shrink: 0;
}

.move-dialog-hint {
    margin-top: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

/* 移动端抽屉样式 */
.move-drawer-content {
    padding: 16px;
}

.move-path-section {
    margin-bottom: 16px;
}

.move-path-label {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
}

.move-path-input-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* 内嵌目录树样式 */
.embedded-tree-section {
    margin-top: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    overflow: hidden;
}

.tree-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.tree-section-title {
    font-size: 14px;
    font-weight: 500;
}

.tree-container {
    min-height: 200px;
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
}

.directory-tree {
    background: transparent;
}

.directory-tree :deep(.el-tree-node__content) {
    height: 44px;
    padding: 0 8px;
    border-radius: 8px;
}

.tree-node {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    width: 100%;
}

.tree-node.is-current {
    color: var(--el-color-primary);
    font-weight: 500;
}

.folder-icon {
    color: var(--el-color-warning);
    font-size: 16px;
}

.node-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

.drawer-footer {
    display: flex;
    gap: 12px;
    padding: 0 16px 16px;
}

.footer-btn {
    flex: 1;
}
</style>

<style>
.move-dialog .el-dialog__body {
    padding: 20px;
}

.move-drawer {
    border-radius: 16px 16px 0 0 !important;
}

.move-drawer .el-drawer__header {
    margin-bottom: 0;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.move-drawer .el-drawer__body {
    padding: 0;
}

.move-drawer .el-drawer__footer {
    padding: 0;
}
</style>
