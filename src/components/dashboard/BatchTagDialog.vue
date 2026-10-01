<template>
    <el-dialog
        :title="$t('batchTag.title')"
        v-model="visible"
        :width="dialogWidth"
        :before-close="beforeClose"
        @close="handleClose"
    >
        <div class="tag-dialog-content batch-tag-container">
            <div class="tag-file-summary"><font-awesome-icon icon="images" /><span>{{ $t('batchTag.selectedFiles', { count: fileCount }) }}</span></div>
            <el-alert v-if="pendingIndexIds.length" :title="$t('tagManagement.indexPending')" type="warning" show-icon :closable="false">
                <el-button size="small" :loading="loading" :disabled="aiBusy" @click="repairIndex"><font-awesome-icon icon="redo" /> {{ $t('aiTags.retry') }}</el-button>
            </el-alert>
            <el-tabs v-model="activeTab" class="tag-operation-tabs" :before-leave="beforeTabChange">
                <el-tab-pane name="add">
                    <template #label><span class="tag-tab-label"><font-awesome-icon icon="plus" /><span>{{ $t('batchTag.addTab') }}</span></span></template>
                    <section class="tag-section">
                        <div class="tag-section-header">
                            <span class="tag-section-icon"><font-awesome-icon icon="tags" /></span>
                            <h4>{{ $t('batchTag.pendingTags') }}</h4>
                            <div class="tag-section-actions">
                                <span class="tag-count">{{ tagsToAdd.length }}</span>
                                <el-tooltip :content="$t('batchTag.addDescription', { count: fileCount })" placement="top">
                                    <button type="button" class="tag-help-button" :aria-label="$t('batchTag.addDescription', { count: fileCount })"><font-awesome-icon icon="question-circle" /></button>
                                </el-tooltip>
                            </div>
                        </div>
                        <div class="input-section">
                            <div class="tag-input-row">
                                <el-input v-model="inputTag" :disabled="loading || aiBusy" :placeholder="$t('batchTag.inputPlaceholder')" @keyup.enter="handleAddInputTag" @input="handleInputChange" clearable>
                                    <template #prefix><font-awesome-icon icon="hashtag" /></template>
                                </el-input>
                                <el-button class="tag-add-button" type="primary" :disabled="loading || aiBusy || !inputTag.trim()" :aria-label="$t('batchTag.addTab')" @click="handleAddInputTag"><font-awesome-icon icon="plus" /></el-button>
                            </div>
                            <div v-if="showSuggestions && suggestions.length" class="suggestions-panel">
                                <button v-for="tag in suggestions" :key="tag" type="button" class="suggestion-item" :disabled="loading || aiBusy" @click="selectSuggestion(tag)"><font-awesome-icon icon="hashtag" /><span>{{ tag }}</span></button>
                            </div>
                        </div>
                        <div v-if="tagsToAdd.length" class="tags-container">
                            <el-tag v-for="tag in tagsToAdd" :key="tag" :closable="!loading && !aiBusy" @close="removeFromToAdd(tag)" class="tag-chip" round>{{ tag }}</el-tag>
                        </div>
                        <div v-else class="empty-message"><font-awesome-icon icon="tag" /><span>{{ $t('batchTag.noPendingTags') }}</span></div>
                        <div class="action-buttons"><el-button type="primary" @click="executeAddTags" :loading="loading" :disabled="!tagsToAdd.length || !fileCount"><font-awesome-icon v-if="!loading" icon="plus" />{{ $t('batchTag.addToAllFiles') }}</el-button></div>
                    </section>
                </el-tab-pane>
                <el-tab-pane name="remove">
                    <template #label><span class="tag-tab-label"><font-awesome-icon icon="minus" /><span>{{ $t('batchTag.removeTab') }}</span></span></template>
                    <section class="tag-section">
                        <div class="tag-section-header">
                            <span class="tag-section-icon muted"><font-awesome-icon icon="tags" /></span>
                            <h4>{{ $t('batchTag.commonTags') }}</h4>
                            <div class="tag-section-actions">
                                <span class="tag-count">{{ commonTags.length }}</span>
                                <el-tooltip :content="$t('batchTag.removeDescription')" placement="top">
                                    <button type="button" class="tag-help-button" :aria-label="$t('batchTag.removeDescription')"><font-awesome-icon icon="question-circle" /></button>
                                </el-tooltip>
                            </div>
                        </div>
                        <div v-if="commonTags.length" class="tags-container">
                            <el-tag v-for="tag in commonTags" :key="tag" :closable="!loading && !aiBusy" @close="handleRemoveCommonTag(tag)" class="tag-chip" type="warning" round>{{ tag }}</el-tag>
                        </div>
                        <div v-else class="empty-message"><font-awesome-icon icon="tag" /><span>{{ $t('batchTag.noCommonTags') }}</span></div>
                    </section>
                </el-tab-pane>
                <el-tab-pane name="clear">
                    <template #label><span class="tag-tab-label"><font-awesome-icon icon="trash-alt" /><span>{{ $t('batchTag.clearTab') }}</span></span></template>
                    <section class="tag-section tag-danger-section">
                        <div class="tag-section-header">
                            <span class="tag-section-icon danger"><font-awesome-icon icon="trash-alt" /></span>
                            <h4>{{ $t('batchTag.clearTab') }}</h4>
                        </div>
                        <el-alert :title="$t('batchTag.clearWarningDesc')" type="warning" :closable="false" show-icon />
                        <div class="action-buttons"><el-button type="danger" @click="handleClearAllTags" :loading="loading" :disabled="!fileCount"><font-awesome-icon v-if="!loading" icon="trash-alt" />{{ $t('batchTag.confirmClearAll') }}</el-button></div>
                    </section>
                </el-tab-pane>
                <el-tab-pane name="ai" lazy>
                    <template #label><span class="tag-tab-label"><AIIcon /><span>{{ $t('aiTags.tab') }}</span></span></template>
                    <AITagPanel v-if="visible" :files="selectedFilesOnly" :disabled="loading" @busy="aiBusy = $event" @applied="handleAIResults" />
                </el-tab-pane>
            </el-tabs>
        </div>
    </el-dialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus';
import fetchWithAuth from '@/utils/fetchWithAuth';
import AITagPanel from './AITagPanel.vue';
import AIIcon from '@/components/icons/AIIcon.vue';

export default {
    name: 'BatchTagDialog',
    components: { AITagPanel, AIIcon },
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

<style scoped src="@/styles/tag-dialog.css"></style>
