<template>
    <el-dialog
        :title="$t('tagManagement.title')"
        v-model="visible"
        :width="dialogWidth"
        :before-close="beforeClose"
        @close="handleClose"
    >
        <div class="tag-management-container">
            <!-- 输入区域 -->
            <div class="input-section">
                <el-input
                    v-model="inputTag"
                    :disabled="aiBusy || loading"
                    :placeholder="$t('tagManagement.inputPlaceholder')"
                    @keyup.enter="handleAddTag"
                    @input="handleInputChange"
                    clearable
                >
                    <template #append>
                        <el-button @click="handleAddTag" type="primary" :disabled="aiBusy || loading">
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

            <!-- 当前标签 -->
            <div class="current-tags-section">
                <h4>{{ $t('tagManagement.currentTags') }}</h4>
                <div v-if="currentTags.length > 0" class="tags-container">
                    <el-tag
                        v-for="tag in currentTags"
                        :key="tag"
                        :closable="!aiBusy && !loading"
                        @close="handleRemoveTag(tag)"
                        class="tag-item"
                    >
                        {{ tag }}
                    </el-tag>
                </div>
                <div v-else class="empty-message">
                    {{ $t('tagManagement.noTags') }}
                </div>
            </div>

            <!-- 常用标签 -->
            <div class="popular-tags-section">
                <h4>{{ $t('tagManagement.popularTags') }}</h4>
                <div v-if="popularTags.length > 0" class="tags-container">
                    <el-tag
                        v-for="tag in popularTags"
                        :key="tag"
                        @click="handleAddPopularTag(tag)"
                        class="tag-item clickable"
                        type="info"
                    >
                        {{ tag }}
                    </el-tag>
                </div>
                <div v-else-if="loadingPopularTags" class="empty-message">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    {{ $t('tagManagement.loading') }}
                </div>
                <div v-else class="empty-message">
                    {{ $t('tagManagement.noPopularTags') }}
                </div>
            </div>
            <el-alert v-if="indexPending" :title="$t('tagManagement.indexPending')" type="warning" show-icon :closable="false">
                <el-button size="small" :loading="loading" :disabled="aiBusy" @click="repairIndex"><font-awesome-icon icon="redo" /> {{ $t('aiTags.retry') }}</el-button>
            </el-alert>
            <AITagPanel v-if="visible" class="single-ai-panel" :files="aiFiles" :disabled="loading" @busy="aiBusy = $event" @applied="handleAIResults" />
        </div>

        <template #footer>
            <span class="dialog-footer">
                <el-button :disabled="aiBusy || loading" @click="handleClose">{{ $t('tagManagement.close') }}</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import fetchWithAuth from '@/utils/fetchWithAuth';
import AITagPanel from './AITagPanel.vue';
import { apiJSON, aiErrorText } from '@/utils/aiTags';

export default {
    name: 'TagManagementDialog',
    components: {
        Loading,
        AITagPanel
    },
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        fileId: {
            type: String,
            required: true
        },
        fileMetadata: {
            type: Object,
            default: () => ({})
        }
    },
    emits: ['update:modelValue', 'tagsUpdated'],
    data() {
        return {
            currentTags: [],
            inputTag: '',
            suggestions: [],
            popularTags: [],
            showSuggestions: false,
            loading: false,
            indexPending: false,
            aiBusy: false,
            loadingPopularTags: false,
            debounceTimer: null
        };
    },
    computed: {
        aiFiles() { return this.fileId ? [{ name: this.fileId, metadata: this.fileMetadata }] : []; },
        visible: {
            get() {
                return this.modelValue;
            },
            set(val) {
                this.$emit('update:modelValue', val);
            }
        },
        dialogWidth() {
            return 'min(500px, 90vw)';
        }
    },
    watch: {
        visible(newVal) {
            if (newVal) {
                this.loadFileTags();
                this.loadPopularTags();
            }
        }
    },
    beforeUnmount() { clearTimeout(this.debounceTimer); },
    methods: {
        beforeClose(done) { if (!this.aiBusy && !this.loading) done(); },
        handleAIResults(results) {
            const result = results.find(item => item.fileId === this.fileId);
            if (result) { this.currentTags = result.tags; this.$emit('tagsUpdated', result.tags); }
        },
        async repairIndex() {
            if (this.aiBusy || this.loading) return;
            this.loading = true;
            try {
                const data = await apiJSON(`/api/manage/tags/${encodeURIComponent(this.fileId)}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'add', tags: [], repairIndex: true })
                });
                this.currentTags = data.tags;
                this.indexPending = !!data.indexPending;
                this.$emit('tagsUpdated', this.currentTags);
            } catch (error) { ElMessage.error(aiErrorText(error, this.$t, this.$te)); }
            finally { this.loading = false; }
        },
        async loadFileTags() {
            this.loading = true;
            try {
                const response = await fetchWithAuth(`/api/manage/tags/${encodeURIComponent(this.fileId)}`, {
                    method: 'GET'
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentTags = data.tags || [];
                } else {
                    throw new Error('Failed to load tags');
                }
            } catch (error) {
                console.error('Error loading file tags:', error);
                ElMessage.error(this.$t('tagManagement.loadFailed'));
            } finally { this.loading = false; }
        },

        async loadPopularTags() {
            this.loadingPopularTags = true;
            try {
                const response = await fetchWithAuth('/api/manage/tags/autocomplete?limit=20', {
                    method: 'GET'
                });

                if (response.ok) {
                    const data = await response.json();
                    this.popularTags = (data.tags || []).filter(tag => !this.currentTags.includes(tag));
                }
            } catch (error) {
                console.error('Error loading popular tags:', error);
            } finally {
                this.loadingPopularTags = false;
            }
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
                    this.suggestions = (data.tags || []).filter(tag => !this.currentTags.includes(tag));
                    this.showSuggestions = this.suggestions.length > 0;
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        },

        selectSuggestion(tag) {
            this.inputTag = tag;
            this.showSuggestions = false;
            this.handleAddTag();
        },

        async handleAddTag() {
            if (this.aiBusy || this.loading) return;
            const tag = this.inputTag.trim();

            if (!tag) {
                return;
            }

            if (this.currentTags.includes(tag)) {
                ElMessage.warning(this.$t('tagManagement.tagExists'));
                this.inputTag = '';
                this.showSuggestions = false;
                return;
            }

            this.loading = true;
            try {
                const response = await fetchWithAuth(`/api/manage/tags/${encodeURIComponent(this.fileId)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'add',
                        repairIndex: this.indexPending,
                        tags: [tag]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentTags = data.tags || [];
                    this.indexPending = !!data.indexPending;
                    this.inputTag = '';
                    this.showSuggestions = false;
                    if (!data.indexPending) ElMessage.success(this.$t('tagManagement.addSuccess'));
                    this.$emit('tagsUpdated', this.currentTags);

                    // 重新加载常用标签
                    this.loadPopularTags();
                } else {
                    const error = await response.json();
                    ElMessage.error(aiErrorText(error.error || { code: 'INTERNAL_ERROR' }, this.$t, this.$te));
                }
            } catch (error) {
                console.error('Error adding tag:', error);
                ElMessage.error(this.$t('tagManagement.addFailed'));
            } finally { this.loading = false; }
        },

        async handleRemoveTag(tag) {
            if (this.aiBusy || this.loading) return;
            this.loading = true;
            try {
                const response = await fetchWithAuth(`/api/manage/tags/${encodeURIComponent(this.fileId)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'remove',
                        repairIndex: this.indexPending,
                        tags: [tag]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentTags = data.tags || [];
                    this.indexPending = !!data.indexPending;
                    if (!data.indexPending) ElMessage.success(this.$t('tagManagement.removeSuccess'));
                    this.$emit('tagsUpdated', this.currentTags);

                    // 重新加载常用标签
                    this.loadPopularTags();
                } else {
                    throw new Error(this.$t('tagManagement.removeFailed'));
                }
            } catch (error) {
                console.error('Error removing tag:', error);
                ElMessage.error(this.$t('tagManagement.removeFailed'));
            } finally { this.loading = false; }
        },

        handleAddPopularTag(tag) {
            if (this.aiBusy || this.loading) return;
            this.inputTag = tag;
            this.handleAddTag();
        },

        handleClose() {
            if (this.aiBusy || this.loading) return;
            this.visible = false;
            this.inputTag = '';
            this.showSuggestions = false;
            this.currentTags = [];
            this.indexPending = false;
            this.popularTags = [];
        }
    }
};
</script>

<style scoped>
.tag-management-container {
    padding: 10px 0 0;
}

.tag-management-container .single-ai-panel {
    margin-bottom: 0;
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

.current-tags-section,
.popular-tags-section {
    margin-bottom: 20px;
}

.current-tags-section h4,
.popular-tags-section h4 {
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

.tag-item.clickable {
    cursor: pointer;
    transition: transform 0.2s;
}

.empty-message {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    padding: 10px 0;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
}
</style>
