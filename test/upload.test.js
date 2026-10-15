import { describe, expect, it, vi } from 'vitest';
import {
    collectFilesFromDataTransferItems, filesToUploadEntries, getRelativeDirectory, joinUploadFolder,
} from '@/utils/upload/directoryTraversal';
import { buildFileUrls, getUrlByFormat, updateFileListUrls } from '@/utils/upload/urlBuilder';

describe('upload directories', () => {
    it('preserves nested directories and normalizes separators and traversal segments', () => {
        expect(getRelativeDirectory('album\\nested\\photo.png')).toBe('album/nested');
        expect(getRelativeDirectory('album/../photo.png')).toBe('album/_');
        expect(getRelativeDirectory('photo.png')).toBe('');
        expect(joinUploadFolder('/uploads/', './album//nested')).toBe('/uploads/album/nested');
        expect(joinUploadFolder('', '')).toBe('');
    });

    it('keeps browser relative paths for folder selections and original File objects', () => {
        const file = new File(['image'], 'photo.png');
        Object.defineProperty(file, 'webkitRelativePath', { value: 'album/nested/photo.png' });
        const [entry] = filesToUploadEntries([file]);
        expect(entry.file).toBe(file);
        expect(entry.relativePath).toBe('album/nested/photo.png');
    });

    it('reads every Chromium directory batch, including nested files', async () => {
        const first = new File(['a'], 'a.png');
        const second = new File(['b'], 'b.png');
        const fileEntry = file => ({ name: file.name, isFile: true, file: resolve => resolve(file) });
        const reader = (name, batches) => ({
            name, isDirectory: true,
            createReader: () => ({ readEntries: resolve => resolve(batches.shift() || []) }),
        });
        const directory = reader('album', [[fileEntry(first)], [reader('nested', [[fileEntry(second)], []])], []]);
        const entries = await collectFilesFromDataTransferItems([{ kind: 'file', webkitGetAsEntry: () => directory }]);
        expect(entries).toEqual([
            { file: first, relativePath: 'album/a.png' },
            { file: second, relativePath: 'album/nested/b.png' },
        ]);
    });

    it('prefers File System Access handles and does not also collect the fallback file', async () => {
        const file = new File(['image'], 'photo.png');
        const fallback = vi.fn();
        const handle = { kind: 'directory', name: 'album', async *values() {
            yield { kind: 'file', name: file.name, getFile: async () => file };
        } };
        const entries = await collectFilesFromDataTransferItems([{
            kind: 'file', getAsFileSystemHandle: async () => handle, getAsFile: fallback,
        }]);
        expect(entries).toEqual([{ file, relativePath: 'album/photo.png' }]);
        expect(fallback).not.toHaveBeenCalled();
    });

    it('falls back to plain files when handles are unavailable and ignores text and null files', async () => {
        const file = new File(['image'], 'photo.png');
        const entries = await collectFilesFromDataTransferItems([
            { kind: 'string', getAsFile: () => { throw new Error('must ignore text'); } },
            { kind: 'file', getAsFileSystemHandle: async () => { throw new Error('not supported'); }, getAsFile: () => file },
            { kind: 'file', getAsFile: () => null },
        ]);
        expect(entries).toEqual([{ file, relativePath: 'photo.png' }]);
    });

    it('propagates directory read failures instead of reporting a partial upload selection', async () => {
        const failure = new Error('directory access denied');
        const entry = { name: 'album', isDirectory: true, createReader: () => ({ readEntries: (resolve, reject) => reject(failure) }) };
        await expect(collectFilesFromDataTransferItems([{ kind: 'file', webkitGetAsEntry: () => entry }])).rejects.toBe(failure);
    });
});

describe('upload result links', () => {
    it('builds copyable URL, Markdown, HTML and BBCode links and defaults unknown formats to URL', () => {
        const urls = buildFileUrls('/file/album/a.png', 'Photo', 'https://img.example');
        expect(urls).toEqual({
            finalURL: 'https://img.example/file/album/a.png',
            mdURL: '![Photo](https://img.example/file/album/a.png)',
            htmlURL: '<img src="https://img.example/file/album/a.png" alt="Photo" width=100% />',
            ubbURL: '[img]https://img.example/file/album/a.png[/img]',
        });
        for (const [format, field] of [['url', 'finalURL'], ['md', 'mdURL'], ['html', 'htmlURL'], ['ubb', 'ubbURL']]) {
            expect(getUrlByFormat(urls, format)).toBe(urls[field]);
        }
        expect(getUrlByFormat(urls, 'unknown')).toBe(urls.finalURL);
    });

    it('updates hosted links when the prefix changes while preserving external links', () => {
        const hosted = { srcID: '/file/a.png', name: 'a.png', uploadChannel: 'cfr2' };
        const external = { srcID: 'https://external.example/a.png', name: 'external', uploadChannel: 'external', finalURL: 'https://external.example/a.png' };
        const before = { ...external };
        updateFileListUrls([hosted, external], 'https://new.example');
        expect(hosted.finalURL).toBe('https://new.example/file/a.png');
        expect(hosted.mdURL).toBe('![a.png](https://new.example/file/a.png)');
        expect(external).toEqual(before);
    });
});
