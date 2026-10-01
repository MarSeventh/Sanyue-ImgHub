<template>
    <el-dialog
        :title="$t('tagManagement.title')"
        v-model="visible"
        :width="dialogWidth"
        :before-close="beforeClose"
        @close="handleClose"
    >
        <div class="tag-dialog-content tag-management-container">
            <section class="tag-section">
                <div class="tag-section-header">
                    <span class="tag-section-icon"><font-awesome-icon icon="tags" /></span>
                    <h4>{{ $t('tagManagement.currentTags') }}</h4>
                    <span class="tag-count">{{ currentTags.length }}</span>
                </div>
                <div class="input-section">
                    <div class="tag-input-row">
                        <el-input
                            v-model="inputTag"
                            :disabled="aiBusy || loading"
                            :placeholder="$t('tagManagement.inputPlaceholder')"
                            @keyup.enter="handleAddTag"
                            @input="handleInputChange"
                            clearable
                        >
                            <template #prefix><font-awesome-icon icon="hashtag" /></template>
                        </el-input>
                        <el-button class="tag-add-button" type="primary" :disabled="aiBusy || loading || !inputTag.trim()" :aria-label="$t('batchTag.addTab')" @click="handleAddTag">
                            <font-awesome-icon icon="plus" />
                        </el-button>
                    </div>
                    <div v-if="showSuggestions && suggestions.length" class="suggestions-panel">
                        <button v-for="tag in suggestions" :key="tag" type="button" class="suggestion-item" :disabled="aiBusy || loading" @click="selectSuggestion(tag)">
                            <font-awesome-icon icon="hashtag" /><span>{{ tag }}</span>
                        </button>
                    </div>
                </div>
                <div v-if="currentTags.length" class="tags-container">
                    <el-tag v-for="tag in currentTags" :key="tag" :closable="!aiBusy && !loading" @close="handleRemoveTag(tag)" class="tag-chip" round>
                        {{ tag }}
                    </el-tag>
                </div>
                <div v-else class="empty-message"><font-awesome-icon icon="tag" /><span>{{ $t('tagManagement.noTags') }}</span></div>
                <div class="popular-tags-section">
                    <div class="tag-section-header">
                        <span class="tag-section-icon muted"><font-awesome-icon icon="hashtag" /></span>
                        <h4>{{ $t('tagManagement.popularTags') }}</h4>
                    </div>
                    <div v-if="popularTags.length" class="tags-container">
                        <el-tag v-for="tag in popularTags" :key="tag" type="info" round class="tag-chip tag-choice" role="button" :tabindex="aiBusy || loading ? -1 : 0" :aria-disabled="aiBusy || loading" @click="handleAddPopularTag(tag)" @keydown.enter.prevent="handleAddPopularTag(tag)" @keydown.space.prevent="handleAddPopularTag(tag)">
                            {{ tag }}
                        </el-tag>
                    </div>
                    <div v-else-if="loadingPopularTags" class="empty-message"><el-icon class="is-loading"><Loading /></el-icon><span>{{ $t('tagManagement.loading') }}</span></div>
                    <div v-else class="empty-message"><font-awesome-icon icon="tag" /><span>{{ $t('tagManagement.noPopularTags') }}</span></div>
                </div>
            </section>
            <el-alert v-if="indexPending" :title="$t('tagManagement.indexPending')" type="warning" show-icon :closable="false">
                <el-button size="small" :loading="loading" :disabled="aiBusy" @click="repairIndex"><font-awesome-icon icon="redo" /> {{ $t('aiTags.retry') }}</el-button>
            </el-alert>
            <AITagPanel v-if="visible" class="single-ai-panel" :files="aiFiles" :disabled="loading" @busy="aiBusy = $event" @applied="handleAIResults" />
        </div>
        <template #footer>
            <div class="dialog-footer"><el-button :disabled="aiBusy || loading" @click="handleClose">{{ $t('tagManagement.close') }}</el-button></div>
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

<style scoped src="@/styles/tag-dialog.css"></style>
<style scoped>
.popular-tags-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-lighter);
}
</style>
