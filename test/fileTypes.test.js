import { describe, expect, it } from 'vitest';
import {
    ensureFileType, getFileCategory, getFileExtension, getFileMimeType, getFileTypeCategory,
    inferFileType, isAudioFile, isImageFile, isVideoFile, normalizeFileType, normalizeMimeType, resolveFileType,
} from '@/utils/mimeTypes';

describe('shared frontend MIME rules', () => {
    it('normalizes MIME essence while retaining case-sensitive parameters', () => {
        const type = ' Multipart/Mixed ; boundary=AbC123; charset=UTF-8 ';
        expect(normalizeMimeType(type)).toBe('multipart/mixed');
        expect(normalizeFileType(type)).toBe('multipart/mixed; boundary=AbC123; charset=UTF-8');
        expect(resolveFileType('photo.jpg', type)).toBe('multipart/mixed; boundary=AbC123; charset=UTF-8');
    });

    it.each(['', null, undefined, 'application/octet-stream', 'binary/octet-stream',
        'application/x-www-form-urlencoded', ' APPLICATION/OCTET-STREAM ; name=Photo '])(
        'infers from a filename when MIME is missing or generic: %s', type => {
            expect(resolveFileType('folder/PHOTO.WEBP', type)).toBe('image/webp');
            expect(getFileCategory({ name: 'folder/PHOTO.WEBP', metadata: { FileType: type } })).toBe('image');
        },
    );

    it('keeps explicit MIME authoritative when the filename disagrees', () => {
        const file = { name: 'image.jpg', metadata: { FileType: 'application/pdf; name=image.png' } };
        expect(getFileMimeType(file)).toBe('application/pdf; name=image.png');
        expect(isImageFile(file)).toBe(false);
        expect(isVideoFile({ name: 'image.jpg', type: 'video/mp4' })).toBe(true);
        expect(isAudioFile({ name: 'movie.mp4', type: 'audio/mpeg' })).toBe(true);
    });

    it('uses strict MIME prefixes and ignores media keywords in parameters and other types', () => {
        for (const type of ['application/x-image', 'application/pdf; name=video.mp4', 'text/image']) {
            expect(getFileTypeCategory(type)).toBe('other');
        }
        expect(getFileTypeCategory(' IMAGE/PNG; name=Photo ')).toBe('image');
        expect(getFileTypeCategory('video/mp4')).toBe('video');
        expect(getFileTypeCategory('audio/ogg')).toBe('audio');
    });

    it.each([
        ['a.jpeg', 'image/jpeg'], ['a.jfif', 'image/jpeg'], ['a.svgz', 'image/svg+xml'],
        ['a.avif', 'image/avif'], ['a.heif', 'image/heif'], ['a.apng', 'image/apng'],
        ['a.tif', 'image/tiff'], ['a.mov', 'video/quicktime'], ['a.mkv', 'video/x-matroska'],
        ['a.mp3', 'audio/mpeg'], ['a.opus', 'audio/ogg'], ['a.pdf', 'application/pdf'],
        ['a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ['a.zip', 'application/zip'], ['a.json', 'application/json'],
    ])('infers %s as %s', (name, type) => {
        expect(inferFileType(name)).toBe(type);
        expect(resolveFileType(name)).toBe(type);
    });

    it('classifies Ogg consistently as audio unless MIME explicitly identifies video', () => {
        expect(isAudioFile('track.ogg')).toBe(true);
        expect(isVideoFile('track.ogg')).toBe(false);
        expect(isVideoFile({ name: 'movie.ogg', type: 'video/ogg' })).toBe(true);
        expect(isAudioFile({ name: 'movie.ogg', type: 'video/ogg' })).toBe(false);
    });

    it('extracts only basename suffixes and leaves unknown or ambiguous names generic', () => {
        expect(getFileExtension('folder/photo.PNG')).toBe('png');
        expect(getFileExtension('folder\\photo.GIF')).toBe('gif');
        for (const name of ['folder.jpg/README', 'folder.jpg\\README', 'README', 'photo.', null]) {
            expect(getFileExtension(name)).toBe('');
        }
        for (const name of ['README', 'a.unknown', 'a.ts', 'a.raw', 'folder.jpg/README']) {
            expect(resolveFileType(name)).toBe('application/octet-stream');
        }
        expect(getFileCategory('README')).toBe('other');
        expect(getFileCategory('a.unknown')).toBe('other');
    });

    it('preserves legacy preview categories without enabling MIME-based image processing', () => {
        for (const [extension, category] of [
            ['pjpeg', 'image'], ['pjp', 'image'], ['raw', 'image'], ['cr2', 'image'], ['psd', 'image'],
            ['flv', 'video'], ['mpeg', 'video'], ['3gp', 'video'], ['ts', 'video'],
            ['wma', 'audio'], ['ape', 'audio'], ['midi', 'audio'],
        ]) {
            const name = `album/file.${extension.toUpperCase()}`;
            expect(getFileCategory(name)).toBe(category);
            const upload = ensureFileType(new File(['original'], name));
            expect(upload.type).toBe('application/octet-stream');
            expect(getFileTypeCategory(upload.type)).toBe('other');
            expect(getFileCategory({ id: 'opaque-id', metadata: { FileName: name } })).toBe(category);
            expect(getFileCategory({ name, type: 'application/pdf' })).toBe('other');
        }
    });

    it('accepts browser files, metadata records, IDs, display names and legacy upload history', () => {
        const inputs = [
            new File(['image'], 'photo.png'),
            { name: 'photo.png', type: 'png' },
            { name: 'photo.png', type: 'image/png' },
            { name: 'album/photo.png', metadata: { FileType: 'application/octet-stream' } },
            { id: 'album/photo.png' },
            { id: 'opaque-id', metadata: { FileName: 'photo.png' } },
        ];
        for (const input of inputs) {
            expect(getFileMimeType(input)).toBe('image/png');
            expect(isImageFile(input)).toBe(true);
        }
        expect(getFileCategory(null)).toBe('other');
        expect(getFileCategory({})).toBe('other');
        const original = { name: 'photo.png', metadata: { FileType: 'application/octet-stream' } };
        getFileMimeType(original);
        expect(original.metadata.FileType).toBe('application/octet-stream');
    });
});

describe('upload MIME completion', () => {
    it.each(['', 'application/octet-stream', 'binary/octet-stream'])('completes %s and preserves bytes, timestamps and directory/queue fields', async type => {
        const original = new File([Uint8Array.of(0, 1, 128, 255)], 'photo.PNG', { type, lastModified: 123456 });
        original.uid = 'upload-123';
        original.uploadRelativePath = 'album/nested/photo.PNG';
        original.uploadFolder = '/uploads/album/nested';
        original.relativePath = 'album/nested/photo.PNG';
        Object.defineProperty(original, 'webkitRelativePath', { value: 'album/nested/photo.PNG' });
        const completed = ensureFileType(original);
        expect(completed).toBeInstanceOf(File);
        expect(completed.type).toBe('image/png');
        expect(completed.name).toBe(original.name);
        expect(completed.lastModified).toBe(original.lastModified);
        expect(completed.size).toBe(original.size);
        expect(new Uint8Array(await completed.arrayBuffer())).toEqual(new Uint8Array(await original.arrayBuffer()));
        for (const field of ['uid', 'uploadRelativePath', 'uploadFolder', 'relativePath', 'webkitRelativePath']) {
            expect(completed[field]).toBe(original[field]);
        }
        expect(original.type).toBe(type);
    });

    it('returns explicit MIME files unchanged, including conflicts with the filename', () => {
        for (const type of ['image/png', 'application/pdf', 'image/png; name=Photo']) {
            const file = new File(['original'], 'photo.jpg', { type });
            expect(ensureFileType(file)).toBe(file);
        }
    });

    it('uses the generic fallback for unknown suffixes and avoids repeated replacement', () => {
        const file = new File(['original'], 'file.unknown');
        const completed = ensureFileType(file);
        expect(completed.type).toBe('application/octet-stream');
        expect(ensureFileType(completed)).toBe(completed);
    });
});
