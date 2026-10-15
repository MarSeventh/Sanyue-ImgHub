import { describe, expect, it, vi } from 'vitest';
import { warning } from './helpers/fileManager';
import { fileManager } from '@/utils/fileManager';
import { validateFileId } from '@/utils/fileIdValidator';
import { validateFolderPath } from '@/utils/pathValidator';

describe('file and folder updates', () => {
    it('adds files and folders without duplicating directory entries', () => {
        expect(fileManager.addFile({ name: 'a.png' })).toBe(true);
        expect(fileManager.addFolder('album')).toBe(true);
        expect(fileManager.addFolder('album')).toBe(false);
        expect(fileManager.getLocalFileList()).toEqual({ files: [{ name: 'a.png' }], directories: ['album'] });
    });

    it('removes moved files from the current view and adds only the destination direct folder', () => {
        fileManager.updateFileListCache({ files: [{ name: 'a.png' }, { name: 'keep.png' }], directories: [] });
        expect(fileManager.moveFile('a.png', 'new/nested/a.png')).toBe(true);
        expect(fileManager.getLocalFileList()).toEqual({ files: [{ name: 'keep.png' }], directories: ['new'] });
    });

    it('keeps new records usable in memory when localStorage is full and warns only once', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        localStorage.setItem(fileManager.FILE_LIST_PATH, JSON.stringify({ files: [], directories: [] }));
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
        expect(fileManager.addFile({ name: 'first.png' })).toBe(true);
        expect(fileManager.addFile({ name: 'second.png' })).toBe(true);
        expect(fileManager.getLocalFileList().files.map(file => file.name)).toEqual(['first.png', 'second.png']);
        expect(localStorage.getItem(fileManager.FILE_LIST_PATH)).toBeNull();
        expect(warning).toHaveBeenCalledTimes(1);
    });

    it.each(['', ' ', '../a.png', 'album/./a.png', './a.png', 'album//a.png', 'bad name.png', 'a?.png'])('rejects invalid rename input: %j', name => {
        expect(validateFileId(name, 'old.png').valid).toBe(false);
    });

    it('accepts nested Unicode filenames but rejects an unchanged name', () => {
        expect(validateFileId('相册/新图.png', 'old.png')).toEqual({ valid: true });
        expect(validateFileId('old.png', 'old.png').valid).toBe(false);
    });

    it.each(['relative/folder', '/a/../b', '/a/./b', '/a//b', '/bad name', '/a%2Fb'])('rejects invalid destination folders: %j', path => {
        expect(validateFolderPath(path).valid).toBe(false);
    });

    it('allows root and Unicode folders and distinguishes typing from final validation', () => {
        for (const path of ['', '/', '/相册/2026']) expect(validateFolderPath(path)).toEqual({ valid: true });
        expect(validateFolderPath('/album/.').valid).toBe(false);
        expect(validateFolderPath('/album/.', { strict: false }).valid).toBe(true);
    });
});
