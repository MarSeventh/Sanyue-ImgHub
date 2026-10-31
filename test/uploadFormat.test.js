import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
vi.mock('@/utils/fetchWithAuth', () => ({ default: vi.fn() }));
vi.mock('@/utils/axios', () => ({ default: vi.fn() }));
import fetchWithAuth from '@/utils/fetchWithAuth';
import axios from '@/utils/axios';
import FileFormatSettings from '@/components/config/FileFormatSettings.vue';
import SysCogUpload from '@/components/config/SysCogUpload.vue';
import UploadForm from '@/components/upload/UploadForm.vue';
import { FORMAT_GROUPS, normalizeExtensions, isValidExtension } from '@/utils/upload/fileFormat';
import { mountTemplate, compileRender } from './helpers/renderTemplate';
import { settingsSnapshot } from '@/mixins/unsavedSettings';
import zh from '@/locales/zh-CN.json';
import en from '@/locales/en.json';

const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const initial = () => ({ enabled: false, mode: 'whitelist', extensions: [] });
const blockedError = () => ({ response: { status: 400, data: { code: 'UPLOAD_FORMAT_NOT_ALLOWED' } } });
const flush = async () => { for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick(); } };
let mounted;

beforeEach(() => { fetchWithAuth.mockReset(); axios.mockReset(); });
afterEach(() => mounted?.unmount());

describe('upload format settings', () => {
    it('shares one save action with expiry, serializes saves and stops on failure', async () => {
        let finish;
        const format = { hasUnsavedChanges: true, saveSettings: vi.fn(() => new Promise(resolve => { finish = resolve; })) };
        const expiry = { hasUnsavedChanges: true, saveSettings: vi.fn().mockResolvedValue(true) };
        const vm = { savingUploadRules: false, $refs: { fileFormatSettings: format, fileExpirySettings: expiry }, $message: { success: vi.fn() }, $t: key => key };
        const saving = SysCogUpload.methods.saveUploadRules.call(vm);
        await SysCogUpload.methods.saveUploadRules.call(vm);
        expect(format.saveSettings).toHaveBeenCalledOnce();
        expect(expiry.saveSettings).not.toHaveBeenCalled();
        finish(true);
        await saving;
        expect(expiry.saveSettings).toHaveBeenCalledWith(false);
        expect(vm.$message.success).toHaveBeenCalledOnce();
        expect(vm.savingUploadRules).toBe(false);
        format.saveSettings.mockResolvedValueOnce(false);
        expiry.saveSettings.mockClear();
        await SysCogUpload.methods.saveUploadRules.call(vm);
        expect(expiry.saveSettings).not.toHaveBeenCalled();
        expect(vm.savingUploadRules).toBe(false);
    });

    async function mount(settings = initial()) {
        fetchWithAuth.mockResolvedValueOnce(json({ fileFormat: settings }));
        mounted = mountTemplate(FileFormatSettings, 'src/components/config/FileFormatSettings.vue', {
            globals: { $message: { error: vi.fn(), success: vi.fn() } },
        });
        await flush();
        return mounted.vm;
    }

    it('renders after channels and before expiry, with both modes and group choices', async () => {
        const { code } = compileRender('src/components/config/SysCogUpload.vue');
        expect(code.indexOf('_createVNode(_component_FileFormatSettings')).toBeLessThan(code.indexOf('_createVNode(_component_FileExpirySettings'));
        await mount();
        expect(mounted.text()).toContain('fileFormat.title');
        expect(mounted.findAll('[data-stub="el-option"]').some(el => el.getAttribute('value') === 'whitelist')).toBe(true);
        expect(mounted.findAll('[data-stub="el-option"]').some(el => el.getAttribute('value') === 'blacklist')).toBe(true);
        expect(mounted.findAll('.format-groups [data-stub="el-button"]')).toHaveLength(5);
        expect(mounted.findAll('.tooltip-help-list li')).toHaveLength(4);
        for (const locale of [zh, en]) {
            expect(Object.keys(locale.fileFormat).sort()).toEqual(Object.keys(zh.fileFormat).sort());
            expect(locale.uploadForm.formatNotAllowed).toBeTruthy();
        }
    });

    it('adds editable groups without duplicates and rejects invalid extensions', async () => {
        const vm = await mount();
        vm.addGroup('images');
        vm.addGroup('images');
        expect(vm.settings.extensions).toEqual(FORMAT_GROUPS.images);
        vm.changeExtensions(['.JPG', 'jpg', ' PDF ', 'tar.gz']);
        expect(vm.settings.extensions).toEqual(['jpg', 'pdf', 'tar.gz']);
        vm.changeExtensions(['*.png']);
        expect(vm.settings.extensions).toEqual(['jpg', 'pdf', 'tar.gz']);
        expect(vm.$message.error).toHaveBeenCalledWith('fileFormat.invalidExtension');
        expect(normalizeExtensions(['.PNG', 'png'])).toEqual(['png']);
        expect(Object.values(FORMAT_GROUPS).flat().every(isValidExtension)).toBe(true);
    });

    it('blocks saving an enabled empty whitelist but permits an empty blacklist', async () => {
        const vm = await mount();
        fetchWithAuth.mockClear();
        vm.settings.enabled = true;
        await vm.saveSettings();
        expect(fetchWithAuth).not.toHaveBeenCalled();
        expect(vm.$message.error).toHaveBeenCalledWith('fileFormat.required');
        vm.settings.mode = 'blacklist';
        fetchWithAuth.mockResolvedValueOnce(json({ fileExpiry: { enabled: true }, cfr2: { channels: [{ name: 'latest' }] } }))
            .mockResolvedValueOnce(json({}));
        await vm.saveSettings();
        expect(JSON.parse(fetchWithAuth.mock.calls[1][1].body)).toEqual({
            fileFormat: { enabled: true, mode: 'blacklist', extensions: [] },
            fileExpiry: { enabled: true }, cfr2: { channels: [{ name: 'latest' }] },
        });
        expect(vm.hasUnsavedChanges).toBe(false);
    });

    it('preserves edits made during a save and leaves failed saves dirty', async () => {
        const vm = await mount();
        vm.settings.extensions = ['jpg'];
        const submitted = { ...vm.settings, extensions: ['jpg'] };
        let finish;
        fetchWithAuth.mockResolvedValueOnce(json({})).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const saving = vm.saveSettings();
        await flush();
        await vm.saveSettings();
        vm.settings.extensions.push('png');
        finish(json({}));
        await saving;
        expect(vm.savedSettingsSnapshot).toBe(settingsSnapshot(submitted));
        expect(vm.hasUnsavedChanges).toBe(true);
        fetchWithAuth.mockRejectedValueOnce(new Error('offline'));
        await vm.saveSettings();
        expect(vm.hasUnsavedChanges).toBe(true);
        expect(vm.settings.extensions).toEqual(['jpg', 'png']);
        expect(vm.saving).toBe(false);
    });
});

describe('upload format failures', () => {
    it('shows the localized reason and skips automatic retries while retaining manual retry', () => {
        const file = { uid: '1', name: 'file.exe' };
        const request = { file };
        const vm = {
            fileList: [{ ...file }], exceptionList: [request], autoReUpload: true, maxRetryCount: 3,
            $t: key => key, truncateFilename: name => name, $message: { error: vi.fn() },
            scheduleAutoRetry: vi.fn(), uploadFile: vi.fn(),
        };
        UploadForm.methods.handleError.call(vm, blockedError(), file);
        expect(vm.$message.error).toHaveBeenCalledWith('uploadForm.formatNotAllowed');
        expect(vm.scheduleAutoRetry).not.toHaveBeenCalled();
        expect(vm.fileList[0].status).toBe('exception');
        vm.exceptionList = [];
        UploadForm.methods.retryFailedFiles.call(vm, [request]);
        expect(vm.uploadFile).not.toHaveBeenCalled();
        expect(vm.exceptionList).toEqual([request]);
        UploadForm.methods.retryFailedFiles.call(vm, [request], true);
        expect(vm.uploadFile).toHaveBeenCalledOnce();
        expect(vm.fileList[0].formatBlocked).toBe(false);
        UploadForm.methods.handleError.call(vm, new Error('offline'), file);
        expect(vm.$message.error).toHaveBeenLastCalledWith('uploadForm.uploadFailed');
        expect(vm.scheduleAutoRetry).toHaveBeenCalledOnce();
    });

    it('preserves the format error from a rejected chunk and does not retry or merge it', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const error = blockedError();
        axios.mockResolvedValueOnce({ data: { success: true, uploadId: 'session' } }).mockRejectedValueOnce(error);
        const file = Object.assign(new File(['test'], 'file.exe'), { uid: '1' });
        const request = { file, onError: vi.fn(), onProgress: vi.fn(), onSuccess: vi.fn() };
        const vm = {
            fileList: [{ uid: '1', uploadChannel: 'cfr2' }], abortControllers: new Map(),
            getFileUploadFolder: () => '', uploadNameType: 'default', exceptionList: [],
            cleanupUploadResources: vi.fn().mockResolvedValue(), onUploadComplete: vi.fn(),
            $t: key => key,
        };
        await UploadForm.methods.uploadFileInChunks.call(vm, request);
        expect(axios).toHaveBeenCalledTimes(2);
        expect(request.onError).toHaveBeenCalledWith(error, file);
        expect(request.onSuccess).not.toHaveBeenCalled();
        expect(vm.cleanupUploadResources).toHaveBeenCalledWith('session', 1);
        expect(vm.onUploadComplete).toHaveBeenCalledOnce();
        expect(vm.abortControllers.size).toBe(0);
    });
});
