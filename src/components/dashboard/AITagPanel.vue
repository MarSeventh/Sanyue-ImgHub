<template>
    <section class="ai-tags" v-loading="loadingConfig">
        <div class="ai-toolbar">
            <div class="ai-heading">
                <span class="ai-heading-icon"><AIIcon /></span>
                <h4>{{ $t('aiTags.tab') }}</h4>
                <el-tooltip :content="$t('aiTags.hint')" placement="top">
                    <span class="ai-heading-help"><font-awesome-icon icon="question-circle" class="help-icon" /></span>
                </el-tooltip>
            </div>
            <el-button v-if="available" class="ai-generate-button" type="primary" :loading="generating" :disabled="disabled || saving || !files.length" @click="generate(false)">
                <font-awesome-icon v-if="!generating" icon="tags" />{{ $t('aiTags.generate') }}
            </el-button>
        </div>
        <div v-if="!loadingConfig && !available" class="ai-empty">
            <span class="ai-empty-icon"><font-awesome-icon icon="cog" /></span>
            <span class="ai-empty-title">{{ configError || $t('aiTags.disabled') }}</span>
            <el-button type="primary" plain @click="$router.push('/systemConfig#ai')">
                <font-awesome-icon icon="cog" />{{ $t('aiTags.settings') }}
            </el-button>
        </div>
        <div v-else-if="available && !rows.length && !generating" class="ai-empty ai-ready">
            <span class="ai-empty-icon"><font-awesome-icon icon="tags" /></span>
            <span class="ai-empty-title">{{ $t('aiTags.ready') }}</span>
        </div>
        <p v-else-if="available && rows.length && !visibleRows.length && !generating && !saving" class="ai-empty-title ai-complete">{{ $t('aiTags.noPending') }}</p>
        <div v-if="generating" class="ai-progress">
            <div class="ai-progress-label">
                <span>{{ $t('aiTags.progress', { done: completed, total: workTotal }) }}</span>
                <el-button size="small" @click="cancel">{{ $t('aiTags.cancel') }}</el-button>
            </div>
            <el-progress :percentage="workTotal ? Math.round(completed / workTotal * 100) : 0" :show-text="false" :stroke-width="6" />
        </div>
        <div v-if="visibleRows.length" class="ai-results">
            <div v-for="row in visibleRows" :key="row.fileId" class="ai-result">
                <div class="ai-result-heading">
                    <font-awesome-icon icon="image" class="ai-file-icon" />
                    <span class="ai-file">{{ fileName(row.fileId) }}</span>
                </div>
                <el-alert v-if="row.error" :title="errorText(row.error)" type="error" show-icon :closable="false" />
                <div v-else class="ai-tag-list">
                    <el-check-tag v-for="tag in row.tags" :key="tag" :checked="row.selected.includes(tag)" :aria-disabled="disabled || saving || generating" @change="toggleTag(row, tag)">{{ tag }}</el-check-tag>
                    <span v-if="!row.tags.length && !row.indexPending" class="ai-empty-title">{{ $t('aiTags.noTags') }}</span>
                </div>
                <el-alert v-if="row.saveError" :title="row.saveError" type="warning" show-icon :closable="false" class="ai-save-error" />
            </div>
        </div>
        <div v-if="visibleRows.length && !generating" class="ai-footer">
            <span class="ai-selection">{{ $t('aiTags.selection', { count: selectedCount }) }}</span>
            <div class="ai-footer-actions">
                <el-button v-if="retryFiles.length" :disabled="disabled || saving" @click="generate(true)"><font-awesome-icon icon="redo" />{{ $t('aiTags.retry') }}</el-button>
                <el-button type="primary" :loading="saving" :disabled="disabled || !pending.length" @click="apply"><font-awesome-icon v-if="!saving" icon="save" />{{ $t('aiTags.apply') }}</el-button>
            </div>
        </div>
    </section>
</template>

<script>
import AIIcon from '@/components/icons/AIIcon.vue';
import { apiJSON, aiErrorText, generateTagSuggestions, applyTagSuggestions } from '@/utils/aiTags';

export default {
    name: 'AITagPanel',
    components: { AIIcon },
    props: { files: { type: Array, required: true }, disabled: { type: Boolean, default: false } },
    emits: ['applied', 'busy'],
    data() {
        return { available: false, configError: '', loadingConfig: true, batchSize: 3, generating: false, saving: false, rows: [], completed: 0, workTotal: 0 };
    },
    computed: {
        fileSignature() { return JSON.stringify(this.files.map(file => file.name)); },
        visibleRows() { return this.rows.filter(row => !row.applied); },
        selectedCount() { return this.pending.reduce((count, row) => count + row.selected.length, 0); },
        retryFiles() { return this.files.filter(file => this.rows.some(row => row.fileId === file.name && row.error)); },
        pending() { return this.visibleRows.filter(row => !row.error && (row.selected.length || row.indexPending)); }
    },
    watch: {
        fileSignature() { this.cancel(); this.rows = []; }
    },
    async mounted() {
        try {
            const config = await apiJSON('/api/manage/ai/tags');
            this.available = config.enabled;
            this.batchSize = config.maxBatchSize;
        } catch (error) { this.configError = this.errorText(error); }
        finally { this.loadingConfig = false; }
    },
    beforeUnmount() { this.cancel(); },
    methods: {
        fileName(id) { return this.files.find(file => file.name === id)?.metadata?.FileName || id; },
        errorText(error) { return aiErrorText(error, this.$t, this.$te); },
        toggleTag(row, tag) {
            if (this.disabled || this.saving || this.generating) return;
            row.selected = row.selected.includes(tag) ? row.selected.filter(item => item !== tag) : [...row.selected, tag];
        },
        cancel() { this.controller?.abort(); },
        async generate(retry) {
            if (this.disabled || this.generating || this.saving) return;
            const files = retry ? this.retryFiles : [...this.files];
            const signature = this.fileSignature;
            if (!retry) this.rows = [];
            const controller = new AbortController();
            this.controller = controller;
            this.generating = true;
            this.completed = 0;
            this.workTotal = files.length;
            this.$emit('busy', true);
            try {
                await generateTagSuggestions(files, {
                    signal: controller.signal, batchSize: this.batchSize,
                    onResult: result => {
                        if (controller.signal.aborted || signature !== this.fileSignature) return;
                        const row = { ...result, selected: [...(result.tags || [])], applied: false, saveError: '' };
                        const index = this.rows.findIndex(item => item.fileId === result.fileId);
                        if (index === -1) this.rows.push(row); else this.rows.splice(index, 1, row);
                        this.completed++;
                    }
                });
            } catch (error) {
                if (signature !== this.fileSignature) return;
                if (error.name === 'AbortError') {
                    for (const file of files) {
                        if (!this.rows.some(row => row.fileId === file.name && !row.error)) {
                            const index = this.rows.findIndex(row => row.fileId === file.name);
                            const row = { fileId: file.name, error: { message: 'CANCELLED' }, selected: [], applied: false };
                            if (index === -1) this.rows.push(row); else if (this.rows[index].error?.message === 'CANCELLED') this.rows.splice(index, 1, row);
                        }
                    }
                }
                if (error.name !== 'AbortError') this.$message.error(this.errorText(error));
            } finally { this.generating = false; this.$emit('busy', false); }
        },
        async apply() {
            if (this.disabled || this.saving || this.generating) return;
            this.saving = true;
            this.$emit('busy', true);
            try {
                await applyTagSuggestions(this.pending.map(row => ({ fileId: row.fileId, tags: row.selected, sourceIdentity: row.sourceIdentity, repairIndex: !!row.indexPending })), result => {
                    const row = this.rows.find(item => item.fileId === result.fileId);
                    if (!row) return;
                    if (result.saved) {
                        const savedTags = new Set(result.tags.map(tag => tag.trim().toLowerCase()));
                        row.tags = row.tags.filter(tag => !savedTags.has(tag.trim().toLowerCase()));
                        row.selected = row.selected.filter(tag => row.tags.includes(tag));
                        row.indexPending = !!result.indexPending;
                        row.applied = !row.tags.length && !row.indexPending;
                        this.$emit('applied', [result]);
                    }
                    row.saveError = result.error ? this.errorText(result.error) : row.indexPending ? this.$t('aiTags.indexPending') : '';
                });
            } catch (error) { this.$message.error(this.errorText(error)); }
            finally { this.saving = false; this.$emit('busy', false); }
        }
    }
};
</script>

<style scoped>
.ai-tags {
    margin: 16px 0; padding: 18px; text-align: left; border-radius: 16px;
    border: 1px solid var(--glass-border); background: var(--glass-bg); box-shadow: var(--glass-shadow);
}
.ai-toolbar, .ai-heading, .ai-result-heading, .ai-progress-label, .ai-footer, .ai-footer-actions {
    display: flex; align-items: center; gap: 10px;
}
.ai-toolbar, .ai-progress-label, .ai-footer { justify-content: space-between; }
.ai-toolbar { flex-wrap: wrap; column-gap: 12px; row-gap: 10px; }
.ai-heading { min-width: 0; min-height: 32px; gap: 8px; }
.ai-heading h4 { display: flex; align-items: center; margin: 0; min-height: 20px; color: var(--el-text-color-primary); font-size: 15px; line-height: 20px; }
.ai-heading-help { display: grid; place-items: center; width: 16px; height: 20px; flex-shrink: 0; }
.ai-heading-help > svg { display: block; width: 14px; height: 14px; }
.ai-toolbar .ai-generate-button { align-self: center; flex-shrink: 0; height: 32px; margin: 0 0 0 auto; padding: 8px 12px; }
.ai-heading-icon, .ai-empty-icon {
    display: grid; place-items: center; color: var(--el-color-primary); background: var(--el-color-primary-light-9); border-radius: 12px;
}
.ai-heading-icon { width: 28px; height: 28px; flex-shrink: 0; font-size: 16px; border-radius: 9px; }
.help-icon { color: var(--el-text-color-secondary); cursor: pointer; }
.ai-tags .el-button { gap: 7px; }
.ai-tags :deep(.el-button > span) { display: inline-flex; align-items: center; gap: 7px; }
.ai-empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 28px 12px 12px; }
.ai-empty-icon { width: 52px; height: 52px; font-size: 22px; }
.ai-empty-title, .ai-selection { color: var(--el-text-color-secondary); font-size: 13px; overflow-wrap: anywhere; }
.ai-result :deep(.el-alert__title) { overflow-wrap: anywhere; }
.ai-ready { padding-bottom: 20px; }
.ai-complete { margin: 18px 0 0; line-height: 1.5; }
.ai-progress { margin-top: 18px; }
.ai-progress-label { color: var(--el-text-color-secondary); margin-bottom: 10px; font-size: 13px; }
.ai-results { display: grid; gap: 12px; margin-top: 18px; }
.ai-result { border: 1px solid var(--el-border-color-light); border-radius: 12px; padding: 14px; background: var(--el-fill-color-blank); }
.ai-result-heading { margin-bottom: 12px; }
.ai-file-icon { color: var(--el-text-color-secondary); flex-shrink: 0; }
.ai-file { flex: 1; min-width: 0; font-weight: 500; overflow-wrap: anywhere; line-height: 1.5; }
.ai-tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ai-tag-list .el-check-tag { max-width: 100%; height: auto; white-space: normal; overflow-wrap: anywhere; }
.ai-tag-list [aria-disabled="true"] { cursor: default; opacity: .65; }
.ai-save-error { margin-top: 12px; }
.ai-footer { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--el-border-color-lighter); flex-wrap: wrap; }
.ai-footer-actions { flex-wrap: wrap; margin-left: auto; }
.ai-footer-actions .el-button { height: 32px; box-sizing: border-box; padding: 8px 15px; }
.ai-footer-actions .el-button + .el-button { margin-left: 0; }
@media (max-width: 480px) {
    .ai-tags { padding: 14px; }
    .ai-footer-actions { width: 100%; }
    .ai-footer-actions .el-button { flex: 1; }
}
</style>
