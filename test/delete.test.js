import { describe, expect, it } from 'vitest';
import './helpers/fileManager';
import { fileManager } from '@/utils/fileManager';

describe('delete from the frontend file cache', () => {
    it('removes one exact file while retaining same-named files in other folders', () => {
        fileManager.updateFileListCache({ files: [{ name: 'a.png' }, { name: 'album/a.png' }], directories: ['album'] });
        expect(fileManager.removeFile('a.png')).toBe(true);
        expect(fileManager.getLocalFileList()).toEqual({ files: [{ name: 'album/a.png' }], directories: ['album'] });
        expect(JSON.parse(localStorage.getItem(fileManager.FILE_LIST_PATH))).toEqual(fileManager.getLocalFileList());
    });

    it('keeps deleting an absent file harmless', () => {
        fileManager.updateFileListCache({ files: [{ name: 'keep.png' }], directories: [] });
        expect(fileManager.removeFile('missing.png')).toBe(true);
        expect(fileManager.getLocalFileList().files).toEqual([{ name: 'keep.png' }]);
    });

    it('removes folder contents without matching a sibling with the same prefix', () => {
        fileManager.updateFileListCache({
            files: [{ name: 'album/a.png' }, { name: 'album/nested/b.png' }, { name: 'albumish/keep.png' }],
            directories: ['album', 'albumish'],
        });
        expect(fileManager.removeFolder('album')).toBe(true);
        expect(fileManager.getLocalFileList()).toEqual({ files: [{ name: 'albumish/keep.png' }], directories: ['albumish'] });
    });
});
