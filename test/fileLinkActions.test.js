import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/utils/fetchWithAuth', () => ({ default: vi.fn() }));
import Dashboard from '@/views/AdminDashBoard.vue';
import fetchWithAuth from '@/utils/fetchWithAuth';

const files = [
    { name: 's3.png', metadata: { Channel: 'S3', S3CdnFileUrl: 'https://cdn.example/s3.png' } },
    { name: 'tg.png', metadata: { Channel: 'TelegramNew', TgFileId: 'telegram-id' } },
    { name: 'dav.png', metadata: { Channel: 'WebDAV', WebDAVPublicUrl: 'https://dav.example/dav.png' } },
    { name: 'missing.png', metadata: { Channel: 'S3' } },
    { name: 'external.png', metadata: { Channel: 'External', ExternalLink: 'https://external.example/a.png' } }
];

function context() {
    const vm = {
        rootUrl: 'https://custom.example/file/', defaultUrlFormat: 'mdUrl',
        defaultUrlContents: { telegram: 'tgId', s3: 's3CdnFileUrl', webdav: 'webdavPublicUrl' },
        paginatedTableData: files, selectedFiles: [],
        $t: key => key,
        $message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
        $loading: vi.fn(() => ({ close: vi.fn() })),
        copyToClipboardFallback: vi.fn()
    };
    vm.generateFileLink = Dashboard.methods.generateFileLink.bind(vm);
    return vm;
}

const expected = [
    '![s3.png](https://cdn.example/s3.png)', 'telegram-id',
    '![dav.png](https://dav.example/dav.png)',
    '![missing.png](https://custom.example/file/missing.png)',
    '![external.png](https://external.example/a.png)'
];

beforeEach(() => {
    localStorage.clear();
    fetchWithAuth.mockReset();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue() } });
});

describe('file management copy actions', () => {
    it('persists format and channel preferences independently and restores them on page load', () => {
        Dashboard.watch.defaultUrlFormat('htmlUrl');
        Dashboard.watch.defaultUrlContents.handler({ telegram: 'tgId', s3: 's3CdnFileUrl', webdav: 'webdavPublicUrl' });
        expect(Dashboard.data().defaultUrlFormat).toBe('htmlUrl');
        expect(Dashboard.data().defaultUrlContents).toEqual({ telegram: 'tgId', s3: 's3CdnFileUrl', webdav: 'webdavPublicUrl' });
    });

    it('copies each single file using its channel content and the chosen format', () => {
        const vm = context();
        files.forEach((file, index) => Dashboard.methods.handleCopy.call(vm, index, file.name));
        expect(navigator.clipboard.writeText.mock.calls.map(([text]) => text)).toEqual(expected);
    });

    it('copies mixed selections and recursively fetched folders using the same preferences', async () => {
        const vm = context();
        vm.selectedFiles = [files[0], files[1], { name: 'album/', isFolder: true }];
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ files: files.slice(2) })));
        await Dashboard.methods.handleBatchCopy.call(vm);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected.join('\n'));
        expect(fetchWithAuth).toHaveBeenCalledWith('/api/manage/list?dir=album%2F&recursive=true&count=-1', { method: 'GET' });
        expect(vm.$message.error).not.toHaveBeenCalled();
    });

    it('copies a whole folder with the same content and format choices', async () => {
        const vm = context();
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ files })));
        await Dashboard.methods.handleFolderCopy.call(vm, 'album/');
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected.join('\n'));
        expect(vm.$message.error).not.toHaveBeenCalled();
    });

    it('keeps the clipboard fallback consistent when clipboard access is unavailable', async () => {
        const vm = context();
        vi.stubGlobal('navigator', {});
        vm.selectedFiles = files;
        await Dashboard.methods.handleBatchCopy.call(vm);
        expect(vm.copyToClipboardFallback).toHaveBeenCalledWith(expected.join('\n'));
    });
});
