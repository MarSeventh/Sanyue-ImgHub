import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('image-conversion', () => ({ compressAccurately: vi.fn() }));
vi.mock('@/components/upload/UploadFileItem.vue', () => ({ default: {} }));
import * as imageConversion from 'image-conversion';
import UploadForm from '@/components/upload/UploadForm.vue';
const { default: UploadFileItem } = await vi.importActual('@/components/upload/UploadFileItem.vue');
import {
    collectFilesFromDataTransferItems, filesToUploadEntries, getRelativeDirectory, joinUploadFolder,
} from '@/utils/upload/directoryTraversal';
import { buildFileUrls, getUrlByFormat, updateFileListUrls } from '@/utils/upload/urlBuilder';
import { isAnimatedImage } from '@/utils/upload/animatedImage';
import { ensureFileType } from '@/utils/mimeTypes';

describe('upload component preprocessing', () => {
    const payload = new Uint8Array(6 * 1024 * 1024);
    const context = overrides => ({
        fileList: [], uploadFolder: '/uploads', uploadChannel: 'telegram',
        customerCompress: true, compressBar: 5, compressQuality: 4, serverCompress: true, convertToWebp: false,
        convertImageToWebp: vi.fn(), copyUploadPath: UploadForm.methods.copyUploadPath,
        $message: { error: vi.fn() }, $t: key => key,
        ...overrides,
    });
    beforeEach(() => {
        imageConversion.compressAccurately.mockReset();
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    });

    it('completes MIME before real upload branching and preserves queue/folder data after compression', async () => {
        const file = new File([Uint8Array.of(255, 216, 255, 217), payload], 'photo.JPG');
        Object.assign(file, { uid: 'file-1', uploadRelativePath: 'album/photo.JPG', uploadFolder: '/uploads/album' });
        imageConversion.compressAccurately.mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' }));
        const form = context();
        const uploaded = await UploadForm.methods.beforeUpload.call(form, file);
        expect(imageConversion.compressAccurately).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/jpeg', uid: 'file-1' }), 4096);
        expect(uploaded.type).toBe('image/jpeg');
        expect(uploaded.uploadFolder).toBe('/uploads/album');
        expect(form.fileList[0]).toMatchObject({ uid: 'file-1', name: 'album/photo.JPG', type: 'image/jpeg', size: uploaded.size, originalSize: file.size, uploadFolder: '/uploads/album', serverCompress: true });
        localStorage.removeItem('uploadHistory');
        form.fileList[0].finalURL = '/file/photo.JPG';
        UploadForm.methods.saveToHistory.call(form, form.fileList[0]);
        expect(JSON.parse(localStorage.getItem('uploadHistory'))[0].type).toBe('image/jpeg');
        localStorage.removeItem('uploadHistory');
    });

    it('does not convert or compress unknown RAW data just because previews classify it as an image', async () => {
        const file = new File([payload], 'photo.RAW');
        const form = context({ convertToWebp: true });
        const uploaded = await UploadForm.methods.beforeUpload.call(form, file);
        expect(uploaded.type).toBe('application/octet-stream');
        expect(form.convertImageToWebp).not.toHaveBeenCalled();
        expect(imageConversion.compressAccurately).not.toHaveBeenCalled();
        expect(form.fileList[0]).toMatchObject({ size: file.size, originalSize: file.size, convertedToWebp: false });
    });

    it('skips local conversion/compression and Telegram compression for an animated upload with missing MIME', async () => {
        const gif = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), char => char.charCodeAt(0));
        const file = new File([gif.slice(0, -1), gif.slice(27, -1), Uint8Array.of(0x3b), payload], 'animation.gif');
        const form = context({ convertToWebp: true });
        const uploaded = await UploadForm.methods.beforeUpload.call(form, file);
        expect(uploaded.type).toBe('image/gif');
        expect(Buffer.from(await uploaded.arrayBuffer()).equals(Buffer.from(await file.arrayBuffer()))).toBe(true);
        expect(form.convertImageToWebp).not.toHaveBeenCalled();
        expect(imageConversion.compressAccurately).not.toHaveBeenCalled();
        expect(form.fileList[0].serverCompress).toBe(false);
    });

    it('preserves explicit non-image MIME even if the filename is .jpg', async () => {
        const file = new File([payload], 'document.jpg', { type: 'application/pdf' });
        const form = context({ convertToWebp: true });
        expect(await UploadForm.methods.beforeUpload.call(form, file)).toBe(file);
        expect(form.convertImageToWebp).not.toHaveBeenCalled();
        expect(imageConversion.compressAccurately).not.toHaveBeenCalled();
    });

    it('records the original and final size when WebP conversion reduces a file without another compression pass', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const file = new File([Uint8Array.of(255, 216, 255, 217), payload], 'photo.jpg', { type: 'image/jpeg' });
        const converted = new File([new Uint8Array(1024)], 'photo.webp', { type: 'image/webp' });
        const form = context({ convertToWebp: true, convertImageToWebp: vi.fn().mockResolvedValue(converted) });
        await UploadForm.methods.beforeUpload.call(form, file);
        expect(imageConversion.compressAccurately).not.toHaveBeenCalled();
        expect(form.fileList[0]).toMatchObject({ type: 'image/webp', size: 1024, originalSize: file.size, convertedToWebp: true });
    });

    it.each(['native WebP', 'skipped conversion', 'failed conversion'])('does not mark %s as a successful conversion', async scenario => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const nativeWebp = scenario === 'native WebP';
        const file = new File(['original'], nativeWebp ? 'photo.webp' : 'photo.jpg', { type: nativeWebp ? 'image/webp' : 'image/jpeg' });
        const convertImageToWebp = scenario === 'failed conversion'
            ? vi.fn().mockRejectedValue(new Error('conversion failed'))
            : vi.fn().mockResolvedValue(null);
        const form = context({ convertToWebp: true, convertImageToWebp });
        expect(await UploadForm.methods.beforeUpload.call(form, file)).toBe(file);
        expect(form.fileList[0].convertedToWebp).toBe(false);
        if (nativeWebp) expect(convertImageToWebp).not.toHaveBeenCalled();
    });

    it('retains the conversion result after a subsequent compression pass', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const file = new File([payload], 'photo.jpg', { type: 'image/jpeg' });
        const converted = new File([payload], 'photo.webp', { type: 'image/webp' });
        imageConversion.compressAccurately.mockResolvedValue(new Blob(['compressed'], { type: 'image/webp' }));
        const form = context({ convertToWebp: true, convertImageToWebp: vi.fn().mockResolvedValue(converted) });
        await UploadForm.methods.beforeUpload.call(form, file);
        expect(imageConversion.compressAccurately).toHaveBeenCalledOnce();
        expect(form.fileList[0]).toMatchObject({ type: 'image/webp', size: 10, originalSize: file.size, convertedToWebp: true });
    });
});

describe('upload file information', () => {
    const display = file => {
        const vm = { file, ...UploadFileItem.methods, $t: (key, params = {}) => `${key}:${JSON.stringify(params)}` };
        for (const [key, getter] of Object.entries(UploadFileItem.computed)) {
            Object.defineProperty(vm, key, { get: () => getter.call(vm) });
        }
        return vm;
    };

    it('uses actual MIME with parameters removed and formats the final file size', () => {
        const vm = display({ name: 'photo.png', type: 'image/webp; name=Photo', size: 1536, originalSize: 2048 });
        expect(vm.mimeType).toBe('image/webp');
        expect(vm.formattedSize).toBe('1.5 KB');
        expect(vm.savedPercent).toBe('25');
        expect(vm.compressionLabel).toBe('25%');
        expect(vm.compressionTitle).toContain('2 KB');
    });

    it('distinguishes a converted WebP from an original WebP and guards against stale conversion flags', () => {
        expect(display({ type: 'image/webp' }).isWebpConverted).toBe(false);
        const converted = display({ type: 'image/webp', convertedToWebp: true });
        expect(converted.isWebpConverted).toBe(true);
        expect(converted.mimeTitle).toContain('uploadForm.webpConversionSuccess');
        expect(display({ type: 'image/png', convertedToWebp: true }).isWebpConverted).toBe(false);
    });

    it('does not claim savings for equal/larger files, missing sizes or a server-compression setting alone', () => {
        for (const file of [
            { size: 2048, originalSize: 2048 }, { size: 4096, originalSize: 2048 },
            { size: 2048, serverCompress: true }, {}, { size: NaN, originalSize: 2048 },
        ]) {
            const vm = display({ name: 'photo.jpg', ...file });
            expect(vm.savedPercent).toBeNull();
            expect(vm.compressionLabel).toBe('');
        }
        expect(display({ name: 'external.jpg' }).formattedSize).toBe('');
        expect(display({ size: 0 }).formattedSize).toBe('0 B');
    });

    it('shows small positive savings accurately and supports large file sizes', () => {
        expect(display({ size: 99999, originalSize: 100000 }).savedPercent).toBe('<0.1');
        expect(display({ size: 1024 ** 3 }).formattedSize).toBe('1 GB');
    });

    it('scrolls overflowing information without trapping wheel input at the edges', () => {
        const element = { scrollWidth: 400, clientWidth: 120, scrollLeft: 0 };
        const event = { currentTarget: element, deltaX: 0, deltaY: 80, preventDefault: vi.fn(), stopPropagation: vi.fn() };
        UploadFileItem.methods.scrollHorizontally(event);
        expect(element.scrollLeft).toBe(80);
        expect(event.preventDefault).toHaveBeenCalledOnce();
        element.scrollLeft = 280;
        event.preventDefault.mockClear();
        UploadFileItem.methods.scrollHorizontally(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});

describe('upload animation preservation', () => {
    const bytes = text => Uint8Array.from(text, char => char.charCodeAt(0));
    const gif = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), char => char.charCodeAt(0));
    const gifFrame = gif.slice(27, -1);
    const file = (parts, name = 'image.gif', type = 'image/gif') => new File(parts, name, { type });
    const uint32 = (value, littleEndian) => {
        const data = new Uint8Array(4);
        new DataView(data.buffer).setUint32(0, value, littleEndian);
        return data;
    };
    const webpChunk = (type, data) => [bytes(type), uint32(data.length, true), data, ...(data.length % 2 ? [new Uint8Array(1)] : [])];
    const webp = chunks => {
        const body = new Blob(chunks.flat());
        return file([bytes('RIFF'), uint32(body.size + 4, true), bytes('WEBP'), body], 'image.webp', 'image/webp');
    };
    const pngChunk = (type, data) => [uint32(data.length, false), bytes(type), data, new Uint8Array(4)];
    const png = chunks => file([bytes('\x89PNG\r\n\x1a\n'), ...chunks.flat()], 'image.png', 'image/png');

    it('distinguishes single-frame and multi-frame GIFs without a looping extension', async () => {
        await expect(isAnimatedImage(file([gif]))).resolves.toBe(false);
        await expect(isAnimatedImage(file([gif.slice(0, -1), gifFrame, bytes(';')]))).resolves.toBe(true);
    });

    it('ignores frame-like bytes in GIF extension data and handles local color tables', async () => {
        const comment = bytes('\x21\xfe\x03\x2c\x2c\x2c\x00');
        await expect(isAnimatedImage(file([gif.slice(0, 19), comment, gif.slice(19)]))).resolves.toBe(false);
        const localFrame = new Uint8Array(gifFrame);
        localFrame[9] = 0x80;
        await expect(isAnimatedImage(file([gif.slice(0, 27), localFrame.slice(0, 10), gif.slice(13, 19), localFrame.slice(10), bytes(';')]))).resolves.toBe(false);
    });

    it('reads large GIF extensions in bounded slices and still finds the second frame', async () => {
        const subBlocks = Array.from({ length: 300 }, () => new Uint8Array(256).fill(255));
        const upload = file([gif.slice(0, 19), bytes('\x21\xfe'), ...subBlocks, bytes('\x00'), gif.slice(19, -1), gifFrame, bytes(';')]);
        const slice = vi.spyOn(upload, 'slice');
        await expect(isAnimatedImage(upload)).resolves.toBe(true);
        expect(slice.mock.calls.length).toBeGreaterThan(1);
        expect(slice.mock.calls.every(([start, end]) => end - start <= 65536)).toBe(true);
    });

    it('recognizes WebP animation flags and animation chunks while preserving static WebP behavior', async () => {
        await expect(isAnimatedImage(webp([webpChunk('VP8X', new Uint8Array(10)), webpChunk('VP8 ', bytes('ANIM'))]))).resolves.toBe(false);
        const animatedHeader = webpChunk('VP8X', Uint8Array.of(2, ...new Uint8Array(9)));
        await expect(isAnimatedImage(webp([animatedHeader]))).resolves.toBe(true);
        await expect(isAnimatedImage(webp([webpChunk('JUNK', bytes('x')), webpChunk('ANIM', new Uint8Array(6))]))).resolves.toBe(true);
    });

    it('recognizes APNG frame counts before image data and ignores animation-like metadata', async () => {
        const ihdr = pngChunk('IHDR', new Uint8Array(13));
        const idat = pngChunk('IDAT', bytes('acTL'));
        await expect(isAnimatedImage(png([ihdr, idat]))).resolves.toBe(false);
        await expect(isAnimatedImage(png([ihdr, pngChunk('acTL', Uint8Array.of(0, 0, 0, 2, 0, 0, 0, 0)), idat]))).resolves.toBe(true);
        await expect(isAnimatedImage(png([ihdr, pngChunk('acTL', Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 0)), idat]))).resolves.toBe(false);
    });

    it('uses signatures even with incorrect image MIME types and file extensions when MIME is missing', async () => {
        const animated = [gif.slice(0, -1), gifFrame, bytes(';')];
        await expect(isAnimatedImage(file(animated, 'image.jpg', 'image/jpeg'))).resolves.toBe(true);
        await expect(isAnimatedImage(file(animated, 'IMAGE.GIF', ''))).resolves.toBe(true);
    });

    it('still identifies animated GIFs after missing/generic upload MIME is completed', async () => {
        for (const type of ['', 'application/octet-stream']) {
            const upload = file([gif.slice(0, -1), gifFrame, bytes(';')], 'animation.GIF', type);
            const completed = ensureFileType(upload);
            expect(completed.type).toBe('image/gif');
            await expect(isAnimatedImage(completed)).resolves.toBe(true);
            expect(new Uint8Array(await completed.arrayBuffer())).toEqual(new Uint8Array(await upload.arrayBuffer()));
        }
    });

    it('leaves ordinary static images and non-image uploads eligible for existing behavior', async () => {
        await expect(isAnimatedImage(file([Uint8Array.of(255, 216, 255, 217)], 'image.jpg', 'image/jpeg'))).resolves.toBe(false);
        const video = file(['video'], 'movie.mp4', 'video/mp4');
        const slice = vi.spyOn(video, 'slice');
        await expect(isAnimatedImage(video)).resolves.toBe(false);
        expect(slice).not.toHaveBeenCalled();
    });

    it('preserves originals when inspection fails or animation-capable files have unknown signatures', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await expect(isAnimatedImage(file([gif.slice(0, -2)]))).resolves.toBe(true);
        await expect(isAnimatedImage(file(['unknown']))).resolves.toBe(true);
        const unreadable = file([gif]);
        vi.spyOn(unreadable, 'slice').mockImplementation(() => { throw new Error('read failed'); });
        await expect(isAnimatedImage(unreadable)).resolves.toBe(true);
    });
});

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
