<template>
    <el-dialog
        :title="$t('batchTag.title')"
        v-model="visible"
        :width="dialogWidth"
        :before-close="beforeClose"
        @close="handleClose"
    >
        <div class="batch-tag-container">
            <el-alert v-if="pendingIndexIds.length" :title="$t('tagManagement.indexPending')" type="warning" show-icon :closable="false">
                <el-button size="small" :loading="loading" :disabled="aiBusy" @click="repairIndex"><font-awesome-icon icon="redo" /> {{ $t('aiTags.retry') }}</el-button>
            </el-alert>
            <el-tabs v-model="activeTab" type="border-card" :before-leave="beforeTabChange">
                <!-- 添加标签 -->
                <el-tab-pane :label="$t('batchTag.addTab')" name="add">
                    <div class="tab-content">
                        <p class="tab-description">{{ $t('batchTag.addDescription', { count: fileCount }) }}</p>

                        <div class="input-section">
                            <el-input
                                v-model="inputTag"
                                :disabled="loading || aiBusy"
                                :placeholder="$t('batchTag.inputPlaceholder')"
                                @keyup.enter="handleAddInputTag"
                                @input="handleInputChange"
                                clearable
                            >
                                <template #append>
                                    <el-button @click="handleAddInputTag" type="primary" :disabled="loading || aiBusy">
                                        <font-awesome-icon icon="plus"/>
                                    </el-button>
                                </template>
                            </el-input>

                            <!-- 自动完成建议 -->
                            <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-panel">
                                <div
                                    v-for="tag in suggestions"
                                    :key="tag"
                                    class="suggestion-item"
                                    @click="selectSuggestion(tag)"
                                >
                                    {{ tag }}
                                </div>
                            </div>
                        </div>

                        <div class="tags-to-add-section">
                            <h4>{{ $t('batchTag.pendingTags') }}</h4>
                            <div v-if="tagsToAdd.length > 0" class="tags-container">
                                <el-tag
                                    v-for="tag in tagsToAdd"
                                    :key="tag"
                                    :closable="!loading && !aiBusy"
                                    @close="removeFromToAdd(tag)"
                                    class="tag-item"
                                >
                                    {{ tag }}
                                </el-tag>
                            </div>
                            <div v-else class="empty-message">
                                {{ $t('batchTag.noPendingTags') }}
                            </div>
                        </div>

                        <div class="action-buttons">
                            <el-button
                                type="primary"
                                @click="executeAddTags"
                                :loading="loading"
                                :disabled="tagsToAdd.length === 0"
                            >
                                {{ $t('batchTag.addToAllFiles') }}
                            </el-button>
                        </div>
                    </div>
                </el-tab-pane>

                <!-- 移除标签 -->
                <el-tab-pane :label="$t('batchTag.removeTab')" name="remove">
                    <div class="tab-content">
                        <p class="tab-description">{{ $t('batchTag.removeDescription') }}</p>

                        <div v-if="commonTags.length > 0" class="common-tags-section">
                            <h4>{{ $t('batchTag.commonTags') }}</h4>
                            <div class="tags-container">
                                <el-tag
                                    v-for="tag in commonTags"
                                    :key="tag"
                                    :closable="!loading && !aiBusy"
                                    @close="handleRemoveCommonTag(tag)"
                                    class="tag-item"
                                    type="warning"
                                >
                                    {{ tag }}
                                </el-tag>
                            </div>
                        </div>
                        <div v-else class="empty-message">
                            {{ $t('batchTag.noCommonTags') }}
                        </div>
                    </div>
                </el-tab-pane>

                <!-- 清空标签 -->
                <el-tab-pane :label="$t('batchTag.clearTab')" name="clear">
                    <div class="tab-content">
                        <p class="tab-description">{{ $t('batchTag.clearDescription', { count: fileCount }) }}</p>

                        <el-alert
                            :title="$t('batchTag.clearWarningTitle')"
                            type="warning"
                            :description="$t('batchTag.clearWarningDesc')"
                            :closable="false"
                            style="margin-bottom: 20px;"
                            center
                        />

                        <div class="action-buttons">
                            <el-button
                                type="danger"
                                @click="handleClearAllTags"
                                :loading="loading"
                            >
                                {{ $t('batchTag.confirmClearAll') }}
                            </el-button>
                        </div>
                    </div>
                </el-tab-pane>
                <el-tab-pane :label="$t('aiTags.tab')" name="ai" lazy>
                    <div class="tab-content ai-tab-content">
                        <AITagPanel v-if="visible" :files="selectedFilesOnly" :disabled="loading" @busy="aiBusy = $event" @applied="handleAIResults" />
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </el-dialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus';
import fetchWithAuth from '@/utils/fetchWithAuth';
import AITagPanel from './AITagPanel.vue';

export default {
    name: 'BatchTagDialog',
    components: { AITagPanel },
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        selectedFiles: {
            type: Array,
            required: true,
            default: () => []
        }
    },
    emits: ['update:modelValue', 'tagsUpdated'],
    data() {
        return {
            activeTab: 'add',
            inputTag: '',
            tagsToAdd: [],
            commonTags: [],
            suggestions: [],
            showSuggestions: false,
            loading: false,
            pendingIndexIds: [],
            aiBusy: false,
            debounceTimer: null
        };
    },
    computed: {
        visible: {
            get() {
                return this.modelValue;
            },
            set(val) {
                this.$emit('update:modelValue', val);
            }
        },
        dialogWidth() {
            return 'min(600px, 90vw)';
        },
        selectedFilesOnly() {
            // 排除文件夹，只保留文件
            return this.selectedFiles.filter(file => !file.isFolder);
        },
        fileCount() {
            return this.selectedFilesOnly.length;
        },
        fileIds() {
            return this.selectedFilesOnly.map(file => file.name);
        }
    },
    watch: {
        visible(newVal) {
            if (newVal) {
                this.loadCommonTags();
            } else {
                this.resetData();
            }
        },
        activeTab(newTab) {
            if (newTab === 'remove') {
                this.loadCommonTags();
            }
        }
    },
    beforeUnmount() { clearTimeout(this.debounceTimer); },
    methods: {
        beforeClose(done) { if (!this.aiBusy && !this.loading) done(); },
        beforeTabChange() { return !this.aiBusy && !this.loading; },
        handleAIResults(results) { this.updateSavedTags(results); },
        updateSavedTags(results) {
            const pending = new Set(this.pendingIndexIds);
            for (const result of results) {
                if (result.saved) {
                    if (result.indexPending) pending.add(result.fileId); else pending.delete(result.fileId);
                }
            }
            this.pendingIndexIds = [...pending];
            this.$emit('tagsUpdated', results);
            this.loadCommonTags(results);
        },
        finishTagOperation(data, successKey) {
            this.updateSavedTags(data.results);
            if (data.success) ElMessage.success(this.$t(successKey, { count: data.updated }));
            else ElMessage.warning(this.$t('batchTag.partialSave', {
                saved: data.results.filter(result => result.saved && !result.indexPending).length,
                total: data.results.length
            }));
            return data.success;
        },
        async repairIndex() {
            if (this.loading || this.aiBusy) return;
            this.loading = true;
            try {
                const response = await fetchWithAuth('/api/manage/tags/batch', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileIds: this.pendingIndexIds, tags: [], action: 'add', repairIndexIds: this.pendingIndexIds })
                });
                if (!response.ok) throw new Error();
                this.finishTagOperation(await response.json(), 'batchTag.addSuccess');
            } catch { ElMessage.error(this.$t('batchTag.addFailed')); }
            finally { this.loading = false; }
        },
        resetData() {
            this.tagsToAdd = [];
            this.inputTag = '';
            this.showSuggestions = false;
            this.activeTab = 'add';
            this.pendingIndexIds = [];
        },

        loadCommonTags(results = []) {
            const updates = new Map(results.filter(result => result.saved).map(result => [result.fileId, result.tags]));
            const allTags = this.selectedFilesOnly.map(file => updates.get(file.name) || file.metadata?.Tags || []);
            this.commonTags = allTags.length ? allTags[0].filter(tag => allTags.every(tags => tags.includes(tag))) : [];
        },

        handleInputChange() {
            clearTimeout(this.debounceTimer);

            if (!this.inputTag || this.inputTag.trim().length === 0) {
                this.showSuggestions = false;
                return;
            }

            this.debounceTimer = setTimeout(() => {
                this.fetchSuggestions();
            }, 300);
        },

        async fetchSuggestions() {
            try {
                const prefix = this.inputTag.trim().toLowerCase();
                const response = await fetchWithAuth(
                    `/api/manage/tags/autocomplete?prefix=${encodeURIComponent(prefix)}&limit=10`,
                    { method: 'GET' }
                );

                if (response.ok) {
                    const data = await response.json();
                    this.suggestions = (data.tags || []).filter(tag => !this.tagsToAdd.includes(tag));
                    this.showSuggestions = this.suggestions.length > 0;
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        },

        selectSuggestion(tag) {
            this.inputTag = tag;
            this.showSuggestions = false;
            this.handleAddInputTag();
        },

        handleAddInputTag() {
            if (this.loading || this.aiBusy) return;
            const tag = this.inputTag.trim();

            if (!tag) {
                return;
            }

            if (this.tagsToAdd.includes(tag)) {
                ElMessage.warning(this.$t('batchTag.tagAlreadyInList'));
                this.inputTag = '';
                this.showSuggestions = false;
                return;
            }

            this.tagsToAdd.push(tag);
            this.inputTag = '';
            this.showSuggestions = false;
        },

        removeFromToAdd(tag) {
            if (this.loading || this.aiBusy) return;
            const index = this.tagsToAdd.indexOf(tag);
            if (index > -1) {
                this.tagsToAdd.splice(index, 1);
            }
        },

        async executeAddTags() {
            if (this.loading || this.aiBusy) return;
            if (this.tagsToAdd.length === 0) {
                ElMessage.warning(this.$t('batchTag.pleaseAddTags'));
                return;
            }

            this.loading = true;

            try {
                const response = await fetchWithAuth('/api/manage/tags/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileIds: this.fileIds,
                        repairIndexIds: this.pendingIndexIds,
                        action: 'add',
                        tags: this.tagsToAdd
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (this.finishTagOperation(data, 'batchTag.addSuccess')) this.tagsToAdd = [];
                } else {
                    throw new Error(this.$t('batchTag.addFailed'));
                }
            } catch (error) {
                console.error('Error adding tags:', error);
                ElMessage.error(this.$t('batchTag.addFailed'));
            } finally {
                this.loading = false;
            }
        },

        async handleRemoveCommonTag(tag) {
            if (this.loading || this.aiBusy) return;
            this.loading = true;

            try {
                const response = await fetchWithAuth('/api/manage/tags/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileIds: this.fileIds,
                        repairIndexIds: this.pendingIndexIds,
                        action: 'remove',
                        tags: [tag]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.finishTagOperation(data, 'batchTag.removeSuccess');
                } else {
                    throw new Error(this.$t('batchTag.removeFailed'));
                }
            } catch (error) {
                console.error('Error removing tag:', error);
                ElMessage.error(this.$t('batchTag.removeFailed'));
            } finally {
                this.loading = false;
            }
        },

        handleClearAllTags() {
            if (this.loading || this.aiBusy) return;
            ElMessageBox.confirm(
                this.$t('batchTag.clearConfirmMessage', { count: this.fileCount }),
                this.$t('batchTag.clearConfirmTitle'),
                {
                    confirmButtonText: this.$t('batchTag.clearConfirmOk'),
                    cancelButtonText: this.$t('batchTag.clearConfirmCancel'),
                    type: 'warning'
                }
            ).then(() => {
                this.executeClearTags();
            }).catch(() => {
                ElMessage.info(this.$t('batchTag.clearCancelled'));
            });
        },

        async executeClearTags() {
            if (this.loading || this.aiBusy) return;
            this.loading = true;

            try {
                const response = await fetchWithAuth('/api/manage/tags/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fileIds: this.fileIds,
                        repairIndexIds: this.pendingIndexIds,
                        action: 'set',
                        tags: []
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.finishTagOperation(data, 'batchTag.clearSuccess');
                } else {
                    throw new Error(this.$t('batchTag.clearFailed'));
                }
            } catch (error) {
                console.error('Error clearing tags:', error);
                ElMessage.error(this.$t('batchTag.clearFailed'));
            } finally {
                this.loading = false;
            }
        },

        handleClose() {
            if (this.aiBusy || this.loading) return;
            this.visible = false;
        }
    }
};
</script>

<style scoped>
.batch-tag-container {
    padding: 0;
}

.tab-content {
    padding: 20px;
}

.ai-tab-content { padding: 0; }

.tab-description {
    margin: 0 0 15px 0;
    color: var(--el-text-color-regular);
    font-size: 14px;
}

.input-section {
    position: relative;
    margin-bottom: 20px;
}

.suggestions-panel {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--admin-dashboard-tag-suggestion-bg-color);
    border: 1px solid var(--admin-dashboard-tag-suggestion-border-color);
    border-radius: 4px;
    box-shadow: var(--admin-dashboard-tag-suggestion-box-shadow);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 4px;
}

.suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.suggestion-item:hover {
    background-color: var(--admin-dashboard-tag-suggestion-item-hover-bg-color);
}

.tags-to-add-section,
.common-tags-section {
    margin-bottom: 20px;
}

.tags-to-add-section h4,
.common-tags-section h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: var(--el-text-color-regular);
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 40px;
}

.tag-item {
    cursor: default;
}

.empty-message {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    padding: 10px 0;
}

.action-buttons {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
}
</style>
