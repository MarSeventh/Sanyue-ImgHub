import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
vi.mock('@/utils/fetchWithAuth', () => ({ default: vi.fn() }));
vi.mock('element-plus', async (importOriginal) => ({
    ...(await importOriginal()),
    ElMessage: { success: vi.fn(), error: vi.fn() },
}));
import { ElMessage } from 'element-plus';
import fetchWithAuth from '@/utils/fetchWithAuth';
import SysCogOthers from '@/components/config/SysCogOthers.vue';
import FileDetailDialog from '@/components/dashboard/FileDetailDialog.vue';
import Dashboard from '@/views/AdminDashBoard.vue';
import UploadHome from '@/views/UploadHome.vue';
import UploadSettingsDialog from '@/components/upload/UploadSettingsDialog.vue';
import {
    EXPIRE_FOREVER, cleanupMethodKeys, describeCleanupResult, effectiveUploadExpire, expireQuery, formatExpireOption,
    getExpiresAt, getUploadFileExpiry, isFileExpirySupported, isValidExpireOption, resolveUploadExpire, sortExpireOptions,
} from '@/utils/fileExpiry';
import { mountTemplate } from './helpers/renderTemplate';

const t = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);
const DAY = 86400000;

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

async function flush() {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        await nextTick();
    }
}

describe('file expiry', () => {
    beforeEach(() => {
        fetchWithAuth.mockReset();
        ElMessage.success.mockReset();
        ElMessage.error.mockReset();
    });

    describe('options', () => {
        it('accepts the same option format as the backend', () => {
            for (const valid of ['1h', '12h', '3d', '3650d', EXPIRE_FOREVER]) expect(isValidExpireOption(valid)).toBe(true);
            for (const invalid of ['0d', '3651d', '1.5d', '1w', '01h', '', null]) expect(isValidExpireOption(invalid)).toBe(false);
        });

        it('sorts by duration, drops invalid entries and duplicates, and keeps forever last', () => {
            expect(sortExpireOptions(['forever', '7d', '12h', '7d', 'bad', '1d'])).toEqual(['12h', '1d', '7d', 'forever']);
        });

        it('formats options for display', () => {
            expect(formatExpireOption('12h', t)).toBe('fileExpiry.hours:{"n":12}');
            expect(formatExpireOption('7d', t)).toBe('fileExpiry.days:{"n":7}');
            expect(formatExpireOption(EXPIRE_FOREVER, t)).toBe('fileExpiry.forever');
        });
    });

    describe('backend support', () => {
        it('tells a disabled feature apart from a backend that predates it', () => {
            expect(isFileExpirySupported({ fileExpiry: { enabled: false } })).toBe(true);
            expect(isFileExpirySupported({ fileExpiry: { enabled: true, options: ['7d'] } })).toBe(true);
            // The platform flag exists on released backends without file expiry
            for (const config of [{}, null, undefined, { serverRuntime: 'worker' }, { fileExpiry: null }]) {
                expect(isFileExpirySupported(config)).toBe(false);
            }
        });

        it('offers upload choices only while the feature is enabled', () => {
            const enabled = { enabled: true, allowCustom: true, defaultExpire: '7d', options: ['7d'] };
            expect(getUploadFileExpiry({ fileExpiry: enabled })).toBe(enabled);
            expect(getUploadFileExpiry({ fileExpiry: { enabled: false } })).toBe(undefined);
            expect(getUploadFileExpiry({})).toBe(undefined);
            expect(UploadHome.computed.fileExpiry.call({ userConfig: { fileExpiry: { enabled: false } } })).toBe(undefined);
        });
    });

    describe('uploads', () => {
        const custom = { allowCustom: true, defaultExpire: '7d', options: ['12h', '7d', 'forever'] };

        it('sends a choice only when uploaders may choose, falling back to the default for stale choices', () => {
            expect(resolveUploadExpire(undefined, '12h')).toBe('');
            expect(resolveUploadExpire({ ...custom, allowCustom: false, options: ['7d'] }, '12h')).toBe('');
            expect(resolveUploadExpire(custom, '12h')).toBe('12h');
            expect(resolveUploadExpire(custom, '30d')).toBe('7d');
            expect(resolveUploadExpire(custom, '')).toBe('7d');
        });

        it('describes the expiry that will actually apply', () => {
            expect(effectiveUploadExpire(undefined, '')).toBe(EXPIRE_FOREVER);
            expect(effectiveUploadExpire({ ...custom, allowCustom: false }, '')).toBe('7d');
            expect(effectiveUploadExpire(custom, '12h')).toBe('12h');
        });

        it('builds the expire query parameter only when there is a value', () => {
            expect(expireQuery('12h')).toBe('&expire=12h');
            expect(expireQuery('7d', '?')).toBe('?expire=7d');
            expect(expireQuery('')).toBe('');
        });
    });

    describe('settings page', () => {
        function context(fileExpiry) {
            return { settings: { fileExpiry }, $t: t, $message: { error: vi.fn() } };
        }

        it('sorts edited options and keeps the default within them', () => {
            const vm = context({ defaultExpire: '7d', options: ['7d', 'forever'] });
            SysCogOthers.methods.handleExpireOptionsChange.call(vm, ['forever', '3d', '12h']);
            expect(vm.settings.fileExpiry).toEqual({ defaultExpire: '12h', options: ['12h', '3d', 'forever'] });
        });

        it('rejects invalid, empty or oversized option lists without changing settings', () => {
            const vm = context({ defaultExpire: '7d', options: ['7d'] });
            for (const values of [['7d', '2w'], [], Array.from({ length: 21 }, (_, i) => `${i + 1}h`)]) {
                SysCogOthers.methods.handleExpireOptionsChange.call(vm, values);
            }
            expect(vm.$message.error).toHaveBeenCalledTimes(3);
            expect(vm.settings.fileExpiry).toEqual({ defaultExpire: '7d', options: ['7d'] });
        });
    });

    describe('file management', () => {
        it('reads the expiry from metadata', () => {
            expect(getExpiresAt({ ExpiresAt: 1792944000000 })).toBe(1792944000000);
            expect(getExpiresAt({})).toBe(null);
            expect(getExpiresAt(undefined)).toBe(null);
        });

        function detailContext() {
            const vm = {
                file: { name: 'album/photo.png', metadata: { ExpiresAt: Date.now() + 1000 } },
                expiryEditing: true, expirySavingIds: {}, expiryRequestId: 0, $t: t, $emit: vi.fn(),
            };
            vm.saveExpiry = FileDetailDialog.methods.saveExpiry.bind(vm);
            return vm;
        }

        it('saves a new expiry or clears it through the metadata API', async () => {
            const later = Date.now() + 86400000;
            fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ success: true, metadata: { FileName: 'photo.png' } })));
            const vm = detailContext();

            await vm.saveExpiry(String(later));
            await vm.saveExpiry(null);

            expect(fetchWithAuth.mock.calls.map(([url, options]) => [url, options.method, JSON.parse(options.body)])).toEqual([
                ['/api/manage/metadata/album/photo.png', 'PATCH', { ExpiresAt: later }],
                ['/api/manage/metadata/album/photo.png', 'PATCH', { ExpiresAt: null }],
            ]);
            expect(vm.$emit).toHaveBeenCalledWith('metadataUpdated', 'album/photo.png', { FileName: 'photo.png' });
            expect(vm.expiryEditing).toBe(false);
        });

        it('rejects past times without a request', async () => {
            const vm = detailContext();
            await vm.saveExpiry(String(Date.now() - 1000));
            expect(fetchWithAuth).not.toHaveBeenCalled();
            expect(ElMessage.error).toHaveBeenCalledWith('fileExpiry.mustBeFuture');
        });

        it('drops a cleared expiry from cached list and detail records', () => {
            const record = () => ({ name: 'photo.png', metadata: { FileName: 'photo.png', ExpiresAt: 1 } });
            const vm = { tableData: [record()], detailFile: record() };
            Dashboard.methods.handleMetadataUpdated.call(vm, 'photo.png', { FileName: 'renamed.png' });
            expect(vm.tableData[0].metadata).toEqual({ FileName: 'renamed.png' });
            expect(vm.detailFile.metadata).toEqual({ FileName: 'renamed.png' });

            Dashboard.methods.handleMetadataUpdated.call(vm, 'photo.png', { FileName: 'renamed.png', ExpiresAt: 2 });
            expect(vm.tableData[0].metadata.ExpiresAt).toBe(2);
        });
    });

    describe('rendered detail dialog', () => {
        let mounted;
        afterEach(() => mounted?.unmount());

        function mountDialog(file, userConfig = { fileExpiry: { enabled: false } }) {
            const events = [];
            mounted = mountTemplate(FileDetailDialog, 'src/components/dashboard/FileDetailDialog.vue', {
                props: { modelValue: true, file, onMetadataUpdated: (...args) => events.push(args) },
                globals: { $store: { getters: { userConfig } } },
                t,
            });
            return { ...mounted, events };
        }

        const file = (name, metadata = {}) => ({ name, metadata: { FileName: name, Channel: 'CloudflareR2', ...metadata } });
        const label = 'fileExpiry.expiresAt';

        it('hides the expiry row and its edit button for backends without file expiry', () => {
            for (const userConfig of [{}, { serverRuntime: 'pages' }, null]) {
                const view = mountDialog(file('a.png'), userConfig);
                expect(view.findAll(`[label="${label}"]`)).toHaveLength(0);
                expect(view.find('.expiry-change')).toBe(null);
                view.unmount();
            }
            mounted = null;
        });

        it('lets administrators edit the expiry while the feature is supported, even when it is turned off', () => {
            const view = mountDialog(file('a.png'));
            expect(view.findAll(`[label="${label}"]`)).toHaveLength(1);
            expect(view.find('.expiry-change')).not.toBe(null);
            expect(view.find('.expiry-forever')).toBe(null);
        });

        it('shows expired files as awaiting cleanup without edit actions', () => {
            const view = mountDialog(file('a.png', { ExpiresAt: Date.now() - 1000 }));
            expect(view.find('.expiry-expired').textContent).toContain('fileExpiry.expiredWaiting');
            expect(view.find('.expiry-change')).toBe(null);
            expect(view.find('.expiry-forever')).toBe(null);
        });

        it('drops the draft and edit state when another file is shown or the dialog closes', async () => {
            const view = mountDialog(file('a.png', { ExpiresAt: Date.now() + DAY }));
            view.find('.expiry-change').click();
            await nextTick();
            expect(view.vm.expiryEditing).toBe(true);
            expect(view.vm.expiryDraft).toBeGreaterThan(Date.now());
            expect(view.find('[data-stub="el-date-picker"]')).not.toBe(null);

            view.props.file = file('b.png');
            await nextTick();
            expect(view.vm.expiryEditing).toBe(false);
            expect(view.vm.expiryDraft).toBe(null);
            expect(view.find('[data-stub="el-date-picker"]')).toBe(null);

            view.find('.expiry-change').click();
            await nextTick();
            view.props.modelValue = false;
            await nextTick();
            expect(view.vm.expiryEditing).toBe(false);
        });

        it('keeps a save that returns after switching files on its own file without touching the current one', async () => {
            let resolve;
            fetchWithAuth.mockReturnValue(new Promise(r => { resolve = r; }));
            const view = mountDialog(file('a.png'));
            const later = Date.now() + DAY;
            const saving = view.vm.saveExpiry(later);
            expect(view.vm.expirySaving).toBe(true);

            view.props.file = file('b.png');
            await nextTick();
            // The lock belongs to a.png, so b.png can still be edited
            expect(view.vm.expirySaving).toBe(false);
            view.find('.expiry-change').click();
            await nextTick();

            resolve(jsonResponse({ success: true, metadata: { FileName: 'a.png', ExpiresAt: later } }));
            await saving;
            await flush();

            expect(fetchWithAuth.mock.calls[0][0]).toBe('/api/manage/metadata/a.png');
            expect(view.events).toEqual([['a.png', { FileName: 'a.png', ExpiresAt: later }]]);
            // b.png keeps its own edit state; the toast names the file that was saved
            expect(view.vm.expiryEditing).toBe(true);
            expect(view.vm.expirySaving).toBe(false);
            expect(ElMessage.success).toHaveBeenCalledWith('a.png: fileExpiry.updated');
        });

        it('saves one change at a time and disables the picker meanwhile', async () => {
            let resolve;
            fetchWithAuth.mockReturnValue(new Promise(r => { resolve = r; }));
            const view = mountDialog(file('a.png', { ExpiresAt: Date.now() + DAY }));
            view.find('.expiry-change').click();
            await nextTick();
            const first = view.vm.saveExpiry(Date.now() + 2 * DAY);
            await nextTick();
            expect(view.find('[data-stub="el-date-picker"]').getAttribute('disabled')).not.toBe(null);

            await view.vm.saveExpiry(Date.now() + 3 * DAY);
            expect(fetchWithAuth).toHaveBeenCalledTimes(1);

            resolve(jsonResponse({ success: true, metadata: { FileName: 'a.png' } }));
            await first;
            expect(view.vm.expirySaving).toBe(false);
            expect(ElMessage.success).toHaveBeenCalledWith('fileExpiry.updated');
        });

        it('keeps the save lock of a file through cancel and switching away and back', async () => {
            let resolve;
            fetchWithAuth.mockReturnValue(new Promise(r => { resolve = r; }));
            const view = mountDialog(file('a.png', { ExpiresAt: Date.now() + DAY }));
            view.find('.expiry-change').click();
            await nextTick();
            const first = view.vm.saveExpiry(Date.now() + 2 * DAY);

            // Cancel while saving, then try again
            view.find('.expiry-cancel').click();
            await nextTick();
            expect(view.vm.expirySaving).toBe(true);
            await view.vm.saveExpiry(Date.now() + 3 * DAY);

            // Switch to another file and back, then try again
            view.props.file = file('b.png');
            await nextTick();
            view.props.file = file('a.png', { ExpiresAt: Date.now() + DAY });
            await nextTick();
            expect(view.vm.expirySaving).toBe(true);
            expect(view.find('.expiry-change').getAttribute('disabled')).not.toBe(null);
            await view.vm.saveExpiry(Date.now() + 4 * DAY);
            expect(fetchWithAuth).toHaveBeenCalledTimes(1);

            resolve(jsonResponse({ success: true, metadata: { FileName: 'a.png' } }));
            await first;
            expect(view.vm.expirySaving).toBe(false);
        });

        it('explains a refused edit of a file that expired meanwhile', async () => {
            fetchWithAuth.mockResolvedValue(jsonResponse({ success: false, message: 'File has expired and is waiting for cleanup.' }, 409));
            const view = mountDialog(file('a.png', { ExpiresAt: Date.now() + 1000 }));
            await view.vm.saveExpiry(Date.now() + DAY);
            expect(ElMessage.error).toHaveBeenCalledWith('fileExpiry.expiredWaiting');
            expect(view.vm.expirySaving).toBe(false);
        });
    });

    describe('rendered settings page', () => {
        let mounted;
        afterEach(() => mounted?.unmount());

        const settings = () => ({
            telemetry: {}, randomImageAPI: {}, cloudflareApiToken: {}, webDAV: {}, publicBrowse: {},
            fileExpiry: { enabled: true, defaultExpire: '7d', allowCustom: true, options: ['7d', 'forever'] },
        });

        async function mountSettings(serverRuntime, cleanupResponse) {
            fetchWithAuth.mockImplementation(async (url, options = {}) => {
                if (url === '/api/manage/expiry') {
                    return jsonResponse(options.method === 'POST' ? cleanupResponse : { success: true, pending: 4, pendingCapped: false });
                }
                if (url.startsWith('/api/manage/sysConfig/others')) return jsonResponse(settings());
                return jsonResponse({});
            });
            const message = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
            mounted = mountTemplate(SysCogOthers, 'src/components/config/SysCogOthers.vue', {
                globals: { $store: { getters: { userConfig: { serverRuntime } } }, $message: message },
                t,
            });
            await flush();
            return { ...mounted, message };
        }

        function tooltipTexts(view) {
            return view.findAll('[data-stub="el-tooltip"] [data-slot="content"]').map(node => node.textContent).join('\n');
        }

        function textOutsideTooltips(view) {
            const clone = view.el.cloneNode(true);
            clone.querySelectorAll('[data-slot="content"]').forEach(node => node.remove());
            return clone.textContent;
        }

        it('keeps cleanup explanations in the question-mark tooltip and the pending count visible', async () => {
            const view = await mountSettings('worker');
            const help = tooltipTexts(view);
            for (const key of ['fileExpiry.cleanupWorker', 'fileExpiry.cleanupGrace', 'fileExpiry.pendingStuck', 'fileExpiry.kvNotice']) {
                expect(help).toContain(key);
                expect(textOutsideTooltips(view)).not.toContain(key);
            }
            expect(help).not.toContain('fileExpiry.cleanupPages');
            expect(view.find('.expiry-pending').textContent).toBe('fileExpiry.pending:{"count":4}');
        });

        it('describes every platform when the runtime is unknown', async () => {
            const help = tooltipTexts(await mountSettings(undefined));
            for (const key of ['fileExpiry.cleanupWorker', 'fileExpiry.cleanupNode', 'fileExpiry.cleanupPages']) {
                expect(help).toContain(key);
            }
        });

        it('reports partial failures and remaining files after a manual cleanup', async () => {
            const view = await mountSettings('pages', {
                success: true, pending: 3, pendingCapped: false, cleanup: { deleted: 2, failed: 1, hasMore: true },
            });
            const button = view.findAll('[data-stub="el-button"]').find(node => node.textContent === 'fileExpiry.cleanNow');
            button.click();
            await flush();
            expect(view.message.warning).toHaveBeenCalledWith(
                'fileExpiry.cleaned:{"count":2}fileExpiry.separatorfileExpiry.cleanedFailed:{"count":1}fileExpiry.separatorfileExpiry.cleanedMore'
            );
            expect(view.message.success).not.toHaveBeenCalled();
            expect(view.find('.expiry-pending').textContent).toBe('fileExpiry.pending:{"count":3}');
        });
    });

    describe('cleanup feedback', () => {
        it('only reports success when nothing failed and nothing is left', () => {
            expect(describeCleanupResult({ deleted: 3, failed: 0, hasMore: false }, t))
                .toEqual({ type: 'success', message: 'fileExpiry.cleaned:{"count":3}' });
            expect(describeCleanupResult({ deleted: 0, failed: 2, hasMore: false }, t).type).toBe('warning');
            expect(describeCleanupResult({ deleted: 5, failed: 0, hasMore: true }, t))
                .toEqual({ type: 'warning', message: 'fileExpiry.cleaned:{"count":5}fileExpiry.separatorfileExpiry.cleanedMore' });
            expect(describeCleanupResult(undefined, t)).toEqual({ type: 'success', message: 'fileExpiry.cleaned:{"count":0}' });
        });

        it('picks the cleanup explanation for the deployment platform', () => {
            expect(cleanupMethodKeys('pages')).toEqual(['fileExpiry.cleanupPages']);
            expect(cleanupMethodKeys('node')).toEqual(['fileExpiry.cleanupNode']);
            expect(cleanupMethodKeys('other')).toHaveLength(3);
        });
    });

    describe('rendered upload settings', () => {
        let mounted;
        afterEach(() => mounted?.unmount());

        it('shows the expiry choice only when uploaders may choose', () => {
            const render = fileExpiry => mountTemplate(UploadSettingsDialog, 'src/components/upload/UploadSettingsDialog.vue', {
                props: { modelValue: true, fileExpiry }, t,
            });
            for (const fileExpiry of [undefined, { enabled: true, allowCustom: false, defaultExpire: '7d', options: ['7d'] }]) {
                mounted = render(fileExpiry);
                expect(mounted.text()).not.toContain('fileExpiry.label');
                mounted.unmount();
            }
            mounted = render({ enabled: true, allowCustom: true, defaultExpire: '7d', options: ['12h', '7d'] });
            expect(mounted.text()).toContain('fileExpiry.label');
        });
    });
});
