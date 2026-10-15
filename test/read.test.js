import { describe, expect, it, vi } from 'vitest';
import { fetchWithAuth, warning } from './helpers/fileManager';
import { fileManager } from '@/utils/fileManager';

describe('file list reads', () => {
    it('loads stored records and returns separate arrays to callers', () => {
        const stored = { files: [{ name: 'a.png' }], directories: ['album'] };
        localStorage.setItem(fileManager.FILE_LIST_PATH, JSON.stringify(stored));
        const first = fileManager.getLocalFileList();
        first.files.push({ name: 'caller-only.png' });
        first.directories.splice(0);
        expect(fileManager.getLocalFileList()).toEqual(stored);
    });

    it('recovers from corrupt stored JSON', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        localStorage.setItem(fileManager.FILE_LIST_PATH, '{');
        expect(fileManager.getLocalFileList()).toEqual({ files: [], directories: [] });
    });

    it('encodes search, tag and multi-select filters and retains server counts', async () => {
        const result = { files: [{ name: 'album/a.png' }], directories: ['album/sub'], totalCount: 10, isIndexedResponse: true };
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify(result)));
        expect(await fileManager.refreshFileList('album/', '  a & b  ', 'x,y', 'private', { fileType: ['image', 'video'], channelName: ['S3:one'] }, true)).toBe(true);
        const [url, options] = fetchWithAuth.mock.calls[0];
        const params = new URL(url, 'https://test').searchParams;
        expect(params.get('dir')).toBe('album/');
        expect(params.get('search')).toBe('a & b');
        expect(params.get('includeTags')).toBe('x,y');
        expect(params.get('excludeTags')).toBe('private');
        expect(params.get('fileType')).toBe('image,video');
        expect(params.get('channelName')).toBe('S3:one');
        expect(params.get('recursive')).toBe('true');
        expect(options.method).toBe('GET');
        expect(fileManager.getLocalFileList()).toEqual(result);
        expect(warning).not.toHaveBeenCalled();
    });

    it('appends later pages using the current cached file count', async () => {
        fileManager.updateFileListCache({ files: [{ name: 'first.png' }], directories: ['album'], totalCount: 2 });
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ files: [{ name: 'second.png' }] })));
        expect(await fileManager.loadMoreFiles('', '', '', '', 30, {}, true)).toBe(true);
        const params = new URL(fetchWithAuth.mock.calls[0][0], 'https://test').searchParams;
        expect(params.get('start')).toBe('1');
        expect(params.get('count')).toBe('30');
        expect(params.get('recursive')).toBe('true');
        expect(fileManager.getLocalFileList()).toEqual({ files: [{ name: 'first.png' }, { name: 'second.png' }], directories: ['album'], totalCount: 2 });
    });

    it('keeps the previous list when a refresh cannot fetch data', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const before = { files: [{ name: 'keep.png' }], directories: [] };
        fileManager.updateFileListCache(before);
        fetchWithAuth.mockRejectedValue(new TypeError('fetch failed'));
        expect(await fileManager.refreshFileList('')).toBe(false);
        expect(fileManager.getLocalFileList()).toEqual(before);
    });

    it('warns when the backend returns an unindexed list', async () => {
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ files: [], directories: [], isIndexedResponse: false })));
        expect(await fileManager.refreshFileList('')).toBe(true);
        expect(warning).toHaveBeenCalledWith('dashboard.indexingWarning');
    });
});
