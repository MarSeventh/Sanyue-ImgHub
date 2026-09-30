<template>
    <div class="ai-settings" v-loading="loading">
        <div v-if="settings" class="first-settings">
            <h3 class="first-title">{{ $t('sysAI.general') }}</h3>
            <section class="basic-settings">
                <el-form label-width="120px" :disabled="saving">
                    <el-form-item :label="$t('sysAI.enable')"><el-switch v-model="settings.enabled" /></el-form-item>
                    <el-form-item :label="$t('sysAI.timeout')"><el-input-number v-model="settings.execution.providerTimeoutMs" :min="1000" :max="20000" :step="1000" /></el-form-item>
                    <el-form-item :label="$t('sysAI.batchSize')"><el-input-number v-model="settings.execution.maxBatchSize" :min="1" :max="3" /></el-form-item>
                    <el-form-item :label="$t('sysAI.concurrency')"><el-input-number v-model="settings.execution.concurrency" :min="1" :max="2" /></el-form-item>
                </el-form>
                <div class="resource-group">
                    <div class="group-header">
                        <h4><font-awesome-icon icon="server" />{{ $t('sysAI.providers') }}<el-tag size="small" type="info">{{ settings.providers.length }}</el-tag></h4>
                        <el-button type="primary" size="small" :disabled="saving || !!testing || settings.providers.length >= 8" @click="openProvider()"><font-awesome-icon icon="plus" />{{ $t('sysAI.addProvider') }}</el-button>
                    </div>
                    <div v-if="!settings.providers.length" class="empty-card">
                        <span class="empty-icon"><font-awesome-icon icon="server" /></span>
                        <span class="empty-title">{{ $t('sysAI.noProviders') }}</span>
                        <el-button type="primary" plain :disabled="saving" @click="openProvider()"><font-awesome-icon icon="plus" />{{ $t('sysAI.addProvider') }}</el-button>
                    </div>
                    <div v-else class="resource-cards">
                        <article v-for="provider in settings.providers" :key="provider.id" class="resource-card" :class="{ disabled: !provider.enabled }">
                            <div class="card-header">
                                <span class="card-title">{{ provider.name || provider.id }}</span>
                                <el-switch v-model="provider.enabled" size="small" :disabled="saving || !!testing" :aria-label="$t('sysAI.enabled')" />
                            </div>
                            <div class="card-body">
                                <div class="card-info"><font-awesome-icon icon="link" /><span :title="provider.baseUrl">{{ provider.baseUrl }}</span></div>
                                <div class="card-info"><font-awesome-icon icon="shield-alt" /><span>{{ keyPreview(provider) }}</span></div>
                            </div>
                            <div class="card-actions">
                                <el-button type="primary" text size="small" :disabled="saving || !!testing" @click="openProvider(provider)"><font-awesome-icon icon="edit" />{{ $t('sysAI.edit') }}</el-button>
                                <el-button type="danger" text size="small" :disabled="saving || !!testing" @click="removeProvider(provider.id)"><font-awesome-icon icon="trash-alt" />{{ $t('sysAI.remove') }}</el-button>
                            </div>
                        </article>
                    </div>
                </div>
                <div class="resource-group">
                    <div class="group-header">
                        <h4><font-awesome-icon icon="robot" />{{ $t('sysAI.models') }}<el-tag size="small" type="info">{{ settings.models.length }}</el-tag></h4>
                        <el-button type="primary" size="small" :disabled="saving || !!testing || !settings.providers.length || settings.models.length >= 16" @click="openModel()"><font-awesome-icon icon="plus" />{{ $t('sysAI.addModel') }}</el-button>
                    </div>
                    <div v-if="!settings.models.length" class="empty-card">
                        <span class="empty-icon"><font-awesome-icon icon="robot" /></span>
                        <span class="empty-title">{{ $t('sysAI.noModels') }}</span>
                        <el-button type="primary" plain :disabled="saving || !settings.providers.length" @click="openModel()"><font-awesome-icon icon="plus" />{{ $t('sysAI.addModel') }}</el-button>
                    </div>
                    <div v-else class="resource-cards">
                        <article v-for="model in settings.models" :key="model.id" class="resource-card" :class="{ disabled: !isModelAvailable(model) }">
                            <div class="card-header">
                                <span class="card-title">{{ model.model }}</span>
                                <div class="model-capabilities"><el-tag size="small" type="info">text</el-tag><el-tag v-if="model.vision" size="small">img</el-tag></div>
                            </div>
                            <div class="card-body"><div class="card-info"><font-awesome-icon icon="server" /><span>{{ providerName(model.providerId) }}</span></div></div>
                            <div class="card-actions">
                                <el-button type="primary" text size="small" :loading="testing === model.id" :disabled="saving || !!testing || !isModelAvailable(model)" @click="testModel(model)"><font-awesome-icon v-if="testing !== model.id" icon="link" />{{ $t('sysAI.test') }}</el-button>
                                <el-button type="primary" text size="small" :disabled="saving || !!testing" @click="openModel(model)"><font-awesome-icon icon="edit" />{{ $t('sysAI.edit') }}</el-button>
                                <el-button type="danger" text size="small" :disabled="saving || !!testing" @click="removeModel(model.id)"><font-awesome-icon icon="trash-alt" />{{ $t('sysAI.remove') }}</el-button>
                            </div>
                        </article>
                    </div>
                </div>
            </section>

            <h3 class="first-title">{{ $t('sysAI.prompts') }}</h3>
            <el-form label-width="120px" class="prompt-form" :disabled="saving">
                <el-form-item>
                    <template #label>
                        {{ $t('sysAI.tagPrompt') }}
                        <el-tooltip placement="right">
                            <template #content>{{ $t('sysAI.promptHint') }} <code v-pre>{language} {maxTags} {preferredTags}</code></template>
                            <font-awesome-icon icon="question-circle" class="help-icon" />
                        </el-tooltip>
                    </template>
                    <el-input v-model="prompt" type="textarea" :rows="8" maxlength="8000" show-word-limit />
                    <el-button class="reset-prompt" @click="prompt = defaultPrompt">{{ $t('sysAI.resetPrompt') }}</el-button>
                </el-form-item>
            </el-form>

            <h3 class="first-title">{{ $t('sysAI.tagging') }}</h3>
            <el-form :model="tagging" label-width="120px" :disabled="saving">
                <el-form-item :label="$t('sysAI.enableTagging')"><el-switch v-model="tagging.enabled" /></el-form-item>
                <el-form-item :label="$t('sysAI.modelName')"><el-select v-model="tagging.modelId"><el-option v-for="m in visionModels" :key="m.id" :label="`${m.model || m.id} · ${providerName(m.providerId)}`" :value="m.id" :disabled="!isModelAvailable(m)" /></el-select></el-form-item>
                <el-form-item :label="$t('sysAI.language')"><el-select v-model="tagging.language"><el-option label="中文" value="zh-CN" /><el-option label="English" value="en" /></el-select></el-form-item>
                <el-form-item :label="$t('sysAI.maxTags')"><el-input-number v-model="tagging.maxTags" :min="1" :max="10" /></el-form-item>
                <el-form-item>
                    <template #label>{{ $t('sysAI.vocabulary') }}<el-tooltip :content="$t('sysAI.vocabularyHint')" placement="right"><font-awesome-icon icon="question-circle" class="help-icon" /></el-tooltip></template>
                    <el-input v-model="vocabulary" type="textarea" :rows="3" />
                </el-form-item>
            </el-form>


            <FloatingSaveButton :show="!loading && !providerDialogVisible && !modelDialogVisible" :loading="saving" :dirty="hasUnsavedChanges" @click="save" />
        </div>
        <el-alert v-else-if="loadError" :title="loadError" type="error" :closable="false" />
        <el-dialog v-model="providerDialogVisible" :title="$t(editingProvider ? 'sysAI.editProvider' : 'sysAI.addProvider')" width="min(600px, 90vw)" class="ai-dialog" destroy-on-close @closed="providerDraft = null">
            <el-form v-if="providerDraft" ref="providerForm" :model="providerDraft" :rules="providerRules" label-position="top" class="editor-form">
                <el-form-item :label="$t('sysAI.name')" prop="name"><el-input v-model="providerDraft.name" maxlength="200" /></el-form-item>
                <el-form-item :label="$t('sysAI.protocol')"><el-input model-value="OpenAI compatible (chat)" disabled /></el-form-item>
                <el-form-item label="Base URL" prop="baseUrl"><el-input v-model="providerDraft.baseUrl" placeholder="https://example.com/v1" maxlength="500" /></el-form-item>
                <el-form-item prop="apiKey" class="api-key-field">
                    <template #label>API Key<el-tooltip :content="$t('sysAI.credentialHint')" placement="top"><font-awesome-icon icon="question-circle" class="help-icon" /></el-tooltip></template>
                    <el-input v-model="providerDraft.apiKey" type="password" show-password autocomplete="new-password" :placeholder="providerDraft.credential.configured ? $t('sysAI.keyUnchanged') : $t('sysAI.enterKey')" maxlength="2048" :disabled="!canStoreCredentials || providerDraft.clearApiKey" />
                </el-form-item>
                <el-form-item v-if="editingProvider && providerDraft.credential.configured" prop="clearApiKey">
                    <el-checkbox v-model="providerDraft.clearApiKey" :disabled="!canStoreCredentials">{{ $t('sysAI.clearKey') }}</el-checkbox>
                </el-form-item>
                <el-form-item :label="$t('sysAI.enabled')"><el-switch v-model="providerDraft.enabled" /></el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="providerDialogVisible = false">{{ $t('sysAI.cancel') }}</el-button>
                <el-button type="primary" @click="confirmProvider">{{ $t(editingProvider ? 'sysAI.confirm' : 'sysAI.confirmAdd') }}</el-button>
            </template>
        </el-dialog>
        <el-dialog v-model="modelDialogVisible" :title="$t(editingModel ? 'sysAI.editModel' : 'sysAI.addModel')" width="min(600px, 90vw)" class="ai-dialog" destroy-on-close @closed="modelDraft = null">
            <el-form v-if="modelDraft" ref="modelForm" :model="modelDraft" :rules="modelRules" label-position="top" class="editor-form">
                <el-form-item :label="$t('sysAI.provider')" prop="providerId"><el-select v-model="modelDraft.providerId"><el-option v-for="p in settings.providers" :key="p.id" :label="p.name || p.id" :value="p.id" /></el-select></el-form-item>
                <el-form-item :label="$t('sysAI.modelName')" prop="model"><el-input v-model="modelDraft.model" maxlength="200" /></el-form-item>
                <el-form-item :label="$t('sysAI.vision')"><el-switch v-model="modelDraft.vision" /></el-form-item>
                <el-form-item>
                    <template #label>{{ $t('sysAI.jsonMode') }}<el-tooltip placement="top"><template #content><span class="json-mode-hint">{{ $t('sysAI.jsonModeHint') }}</span></template><font-awesome-icon icon="question-circle" class="help-icon" /></el-tooltip></template>
                    <el-select v-model="modelDraft.structuredOutput"><el-option :label="$t('sysAI.promptOnly')" value="none" /><el-option :label="$t('sysAI.nativeJsonObject')" value="json" /></el-select>
                </el-form-item>
                <el-form-item :label="$t('sysAI.outputTokens')"><el-input-number v-model="modelDraft.maxOutputTokens" :min="64" :max="2048" /></el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="modelDialogVisible = false">{{ $t('sysAI.cancel') }}</el-button>
                <el-button type="primary" @click="confirmModel">{{ $t(editingModel ? 'sysAI.confirm' : 'sysAI.confirmAdd') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script>
import FloatingSaveButton from '@/components/FloatingSaveButton.vue';
import { apiJSON, aiErrorText } from '@/utils/aiTags';
import unsavedSettings from '@/mixins/unsavedSettings';
const PROMPT_ID = 'builtin.image-tags.v1';
const newId = prefix => prefix + (globalThis.crypto?.randomUUID?.().replace(/-/g, '') || Date.now().toString(36) + Math.random().toString(36).slice(2));
export default {
    mixins: [unsavedSettings],
    name: 'SysCogAI', components: { FloatingSaveButton },
    data() { return { settings: null, loading: true, saving: false, testing: '', loadError: '', prompt: '', defaultPrompt: '', vocabulary: '', canStoreCredentials: false, providerDialogVisible: false, modelDialogVisible: false, providerDraft: null, modelDraft: null, editingProvider: false, editingModel: false }; },
    computed: {
        editableSettings() { return this.settings ? this.payload() : null; },
        tagging() { return this.settings.capabilities['image.tags']; },
        visionModels() { return this.settings?.models.filter(model => model.vision) || []; },
        availableVisionModels() { return this.visionModels.filter(model => this.isModelAvailable(model)); },
        providerRules() {
            return {
                name: [this.requiredRule(this.$t('sysAI.name'))],
                baseUrl: [this.requiredRule('Base URL'), {
                    validator: (_rule, value, callback) => {
                        try {
                            const url = new URL(value);
                            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
                            callback();
                        } catch { callback(new Error(this.$t('sysAI.invalidURL'))); }
                    }, trigger: 'blur'
                }],
                apiKey: [{ validator: (_rule, value, callback) => {
                    if (!this.canStoreCredentials) return callback(new Error(this.$t('sysAI.credentialHint')));
                    if (!this.providerDraft?.credential.configured && !this.providerDraft?.clearApiKey && !value?.trim()) return callback(new Error(this.$t('sysAI.enterKey')));
                    callback();
                }, trigger: 'blur' }]
            };
        },
        modelRules() {
            return { providerId: [this.requiredRule(this.$t('sysAI.provider'))], model: [this.requiredRule(this.$t('sysAI.modelName'))] };
        }
    },
    watch: {
        availableVisionModels() { this.syncTaggingModel(); }
    },
    async mounted() {
        try { this.setConfig(await apiJSON('/api/manage/sysConfig/ai')); }
        catch (error) { this.loadError = this.errorText(error); }
        finally { this.loading = false; }
    },
    methods: {
        errorText(error) { return aiErrorText(error, this.$t, this.$te); },
        setConfig(config) {
            this.canStoreCredentials = config.canStoreCredentials;
            this.defaultPrompt = config.defaults.tagPrompt;
            this.prompt = config.promptOverrides[PROMPT_ID]?.template || this.defaultPrompt;
            this.vocabulary = config.capabilities['image.tags'].preferredTags.join(', ');
            this.settings = config;
            this.markSettingsSaved();
        },
        payload() {
            const config = JSON.parse(JSON.stringify(this.settings));
            config.promptOverrides = this.prompt === this.defaultPrompt ? {} : { [PROMPT_ID]: { template: this.prompt } };
            config.capabilities['image.tags'].preferredTags = this.vocabulary.split(/[,，\n]/).map(tag => tag.trim()).filter(Boolean);
            return config;
        },
        requiredRule(field) { return { required: true, whitespace: true, message: this.$t('sysAI.required', { field }), trigger: 'blur' }; },
        providerName(id) { return this.settings.providers.find(provider => provider.id === id)?.name || id; },
        isModelAvailable(model) { return this.settings?.providers.some(provider => provider.id === model.providerId && provider.enabled) || false; },
        syncTaggingModel() {
            if (!this.settings || this.availableVisionModels.some(model => model.id === this.tagging.modelId)) return;
            const hadSelectedModel = !!this.tagging.modelId;
            this.tagging.modelId = this.availableVisionModels[0]?.id || '';
            if (!this.tagging.modelId && hadSelectedModel) this.tagging.enabled = false;
        },
        keyPreview(provider) {
            if (provider.clearApiKey) return this.$t('sysAI.keyNotConfigured');
            const key = provider.apiKey?.trim();
            if (key) return key.length > 6 ? `${key.slice(0, 2)}******${key.slice(-4)}` : '******';
            return provider.credential.maskedKey || (provider.credential.configured ? '******' : this.$t('sysAI.keyNotConfigured'));
        },
        openProvider(provider) {
            if (this.saving || this.testing || (!provider && this.settings.providers.length >= 8)) return;
            this.editingProvider = !!provider;
            this.providerDraft = provider ? JSON.parse(JSON.stringify(provider)) : { id: newId('provider_'), name: '', protocol: 'openai-compatible', baseUrl: '', enabled: true, credential: { source: 'stored', configured: false } };
            this.providerDraft.credential = { source: 'stored', configured: this.providerDraft.credential?.source === 'stored' && !!this.providerDraft.credential.configured, maskedKey: this.providerDraft.credential?.maskedKey || '' };
            this.providerDialogVisible = true;
        },
        async confirmProvider() {
            if (!await this.$refs.providerForm.validate().catch(() => false)) return;
            const provider = JSON.parse(JSON.stringify(this.providerDraft));
            provider.name = provider.name.trim();
            provider.baseUrl = provider.baseUrl.trim();
            const index = this.settings.providers.findIndex(item => item.id === provider.id);
            if (index < 0) this.settings.providers.push(provider); else this.settings.providers.splice(index, 1, provider);
            this.providerDialogVisible = false;
        },
        removeProvider(id) {
            if (this.settings.models.some(model => model.providerId === id)) { this.$message.warning(this.$t('sysAI.providerInUse')); return; }
            this.settings.providers = this.settings.providers.filter(provider => provider.id !== id);
        },
        openModel(model) {
            if (this.saving || this.testing || !this.settings.providers.length || (!model && this.settings.models.length >= 16)) return;
            this.editingModel = !!model;
            this.modelDraft = model ? JSON.parse(JSON.stringify(model)) : { id: newId('model_'), providerId: this.settings.providers[0].id, model: '', vision: true, structuredOutput: 'none', maxOutputTokens: 256 };
            this.modelDialogVisible = true;
        },
        async confirmModel() {
            if (!await this.$refs.modelForm.validate().catch(() => false)) return;
            const model = JSON.parse(JSON.stringify(this.modelDraft));
            model.model = model.model.trim();
            const index = this.settings.models.findIndex(item => item.id === model.id);
            if (index < 0) this.settings.models.push(model); else this.settings.models.splice(index, 1, model);
            this.syncTaggingModel();
            this.modelDialogVisible = false;
        },
        removeModel(id) {
            this.settings.models = this.settings.models.filter(model => model.id !== id);
            this.syncTaggingModel();
        },
        async save() {
            if (this.saving) return;
            this.saving = true;
            try {
                this.setConfig(await apiJSON('/api/manage/sysConfig/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.payload()) }));
                this.$message.success(this.$t('sysAI.saved'));
            } catch (error) { this.$message.error(this.errorText(error)); }
            finally { this.saving = false; }
        },
        async testModel(model) {
            if (this.saving || this.testing || !this.isModelAvailable(model)) return;
            this.testing = model.id;
            try {
                const result = await apiJSON('/api/manage/ai/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: this.payload(), modelId: model.id }) });
                this.$message.success(this.$t('sysAI.testSuccess', { ms: result.elapsedMs }));
            } catch (error) { this.$message.error(this.errorText(error)); }
            finally { this.testing = ''; }
        }
    }
};
</script>

<style scoped>
.ai-settings { padding: 20px; min-height: 500px; }
.first-settings { margin-bottom: 40px; }
.first-title {
    display: flex; align-items: center; gap: 8px; margin-bottom: 20px;
    padding-bottom: 12px; border-bottom: 2px solid var(--el-color-primary-light-7);
}
.help-icon { margin-left: 5px; cursor: pointer; }
.json-mode-hint { display: block; white-space: pre-line; max-width: min(420px, calc(100vw - 32px)); }

.first-settings :deep(.el-form) {
    padding: 20px 24px; background-color: var(--glass-bg) !important;
    backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border-radius: 16px; border: 1px solid var(--glass-border);
    margin-bottom: 20px; box-shadow: var(--glass-shadow);
}
.first-settings :deep(.el-form-item) { margin-bottom: 20px; display: flex; flex-direction: column; align-items: flex-start; }
.first-settings :deep(.el-form-item:last-child) { margin-bottom: 0; }
.first-settings :deep(.el-form-item__label) {
    text-align: left; padding-bottom: 8px; font-weight: 500; color: var(--el-text-color-primary);
    width: auto !important; display: flex; align-items: center; gap: 5px;
}
.first-settings :deep(.el-form-item__content) { width: 100%; max-width: 400px; margin-left: 0 !important; }
.first-settings :deep(.el-input), .first-settings :deep(.el-select) { width: 100%; }
.first-settings :deep(.el-switch) { --el-switch-on-color: var(--el-color-primary); }
.first-settings .prompt-form :deep(.el-form-item__content) { max-width: 800px; }
.reset-prompt { margin-top: 12px; }
.empty-card {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    padding: 32px 24px; margin-bottom: 20px; border-radius: 16px;
    background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow);
}
.empty-icon {
    display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px;
    background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-size: 22px;
}
.empty-title { color: var(--el-text-color-secondary); font-size: 14px; }
.empty-card .el-button { gap: 8px; }
.empty-card :deep(.el-button > span) { display: inline-flex; align-items: center; gap: 8px; }
.resource-group { margin-bottom: 20px; border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; background: var(--glass-bg); box-shadow: var(--glass-shadow); text-align: left; }
.group-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; background: var(--glass-header-bg); border-bottom: 1px solid var(--glass-header-border); }
.group-header h4 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 15px; }
.group-header h4 > svg { color: var(--el-color-primary); }
.resource-group .empty-card { margin: 0; border: 0; box-shadow: none; border-radius: 0; background: transparent; }
.resource-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 16px; padding: 20px; }
.resource-card { display: flex; flex-direction: column; border: 1px solid var(--glass-border); border-radius: 10px; background: var(--glass-bg); overflow: hidden; min-width: 0; }
.resource-card.disabled { opacity: .65; }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 16px; background: var(--glass-header-bg); border-bottom: 1px solid var(--glass-header-border); }
.card-title { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; min-width: 0; }
.card-header .el-tag { flex-shrink: 0; }
.model-capabilities { display: flex; gap: 6px; flex-shrink: 0; }
.card-body { display: grid; gap: 10px; padding: 16px; flex: 1; }
.card-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--el-text-color-secondary); min-width: 0; }
.card-info svg { flex-shrink: 0; }
.card-info span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px; padding: 8px 12px; border-top: 1px solid var(--glass-border); }
.card-actions .el-button + .el-button { margin-left: 0; }
.ai-settings :deep(.el-button > span) { display: inline-flex; align-items: center; gap: 6px; }
.editor-form { text-align: left; }
.editor-form :deep(.el-form-item__label) { display: flex; align-items: center; gap: 5px; }
.editor-form :deep(.el-input), .editor-form :deep(.el-select) { width: 100%; }
.editor-form :deep(.el-checkbox) { display: flex; width: 100%; }
.api-key-field :deep(.el-form-item__error) { position: static; width: 100%; line-height: 1.5; }
@media (max-width: 480px) {
    .group-header { padding: 14px 12px; flex-wrap: wrap; }
    .resource-cards { padding: 12px; }
}
@media (max-width: 768px) {
    .ai-settings { padding: 15px; padding-bottom: 80px; }
    .first-settings :deep(.el-form) { padding: 12px 15px; }
    .first-settings :deep(.el-form-item__content) { max-width: 100%; }
}
</style>
