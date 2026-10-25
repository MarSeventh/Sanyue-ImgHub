import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import {
    EXPIRE_FOREVER, effectiveUploadExpire, expireQuery, formatExpireOption, getExpiresAt,
    isValidExpireOption, resolveUploadExpire, sortExpireOptions,
} from '@/utils/fileExpiry';

const t = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

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
                expiryEditing: true, expirySaving: false, $t: t, $emit: vi.fn(),
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
});
