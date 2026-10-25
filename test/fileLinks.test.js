import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, h, nextTick, reactive } from 'vue';
import FileDetailDialog from '@/components/dashboard/FileDetailDialog.vue';
import {
    buildManagementFileLinks, getAvailableLinkContents, getManagementCopyLink, loadLinkPreferences
} from '@/utils/dashboard/fileLinks';

const root = 'https://img.example/file/';
const s3 = {
    name: 'album/photo.png',
    metadata: {
        Channel: 'S3', FileName: '照片.png',
        S3Location: 'https://bucket.example/photo.png', S3CdnFileUrl: 'https://cdn.example/photo.png'
    }
};
const telegram = { name: 'tg.png', metadata: { Channel: 'TelegramNew', TgFileId: 'opaque-file-id' } };
const webdav = { name: 'wd.png', metadata: { Channel: 'WebDAV', WebDAVPublicUrl: 'https://dav.example/public/wd.png' } };

beforeEach(() => localStorage.clear());

describe('file management link preferences', () => {
    it('restores independent format and per-channel contents, rejecting invalid combinations', () => {
        localStorage.setItem('defaultUrlFormat', 'mdUrl');
        localStorage.setItem('defaultUrlContents', JSON.stringify({ telegram: 's3Location', s3: 's3CdnFileUrl', webdav: 'webdavPublicUrl' }));
        expect(loadLinkPreferences(localStorage)).toEqual({
            format: 'mdUrl', contents: { telegram: 'originUrl', s3: 's3CdnFileUrl', webdav: 'webdavPublicUrl' }
        });
        localStorage.setItem('defaultUrlContents', '{');
        expect(loadLinkPreferences(localStorage).format).toBe('mdUrl');
        expect(loadLinkPreferences({ getItem() { throw Error('unavailable'); } }).format).toBe('originUrl');
    });

    it('uses the selected source in all four formats', () => {
        expect(buildManagementFileLinks(s3, root, 's3CdnFileUrl').urls).toEqual({
            originUrl: 'https://cdn.example/photo.png',
            mdUrl: '![照片.png](https://cdn.example/photo.png)',
            htmlUrl: '<img src="https://cdn.example/photo.png" alt="照片.png" width=100%>',
            bbUrl: '[img]https://cdn.example/photo.png[/img]'
        });
        expect(getManagementCopyLink(s3, root, 'htmlUrl', { s3: 's3Location' })).toContain('src="https://bucket.example/photo.png"');
        expect(getManagementCopyLink(webdav, root, 'bbUrl', { webdav: 'webdavPublicUrl' })).toBe('[img]https://dav.example/public/wd.png[/img]');
    });

    it('copies mixed-channel selections with each channel preference and a safe unavailable-source fallback', () => {
        const noCdn = { name: 'old.png', metadata: { Channel: 'S3' } };
        const external = { name: 'ext.png', metadata: { Channel: 'External', ExternalLink: 'https://external.example/a.png' } };
        const preferences = { telegram: 'tgId', s3: 's3CdnFileUrl', webdav: 'webdavPublicUrl' };
        expect([s3, telegram, webdav, noCdn, external].map(file => getManagementCopyLink(file, root, 'mdUrl', preferences))).toEqual([
            '![照片.png](https://cdn.example/photo.png)',
            'opaque-file-id',
            '![wd.png](https://dav.example/public/wd.png)',
            '![old.png](https://img.example/file/old.png)',
            '![ext.png](https://external.example/a.png)'
        ]);
        expect(getAvailableLinkContents(noCdn)).toEqual(['originUrl']);
        expect(buildManagementFileLinks(telegram, root, 'tgId').urls).toEqual({ tgId: 'opaque-file-id' });
    });

    it('applies custom prefixes only to host links and keeps channel choices constrained', () => {
        expect(buildManagementFileLinks(s3, '/custom/', 'originUrl').urls.originUrl).toBe('/custom/album/photo.png');
        expect(buildManagementFileLinks(s3, '/custom/', 's3CdnFileUrl').urls.originUrl).toBe(s3.metadata.S3CdnFileUrl);
        expect(getAvailableLinkContents({ ...s3, metadata: { ...s3.metadata, Channel: 'CloudflareR2' } })).toEqual(['originUrl']);
        expect(getManagementCopyLink(null, root, 'mdUrl', {})).toBe('');
    });
});

describe('file detail content changes', () => {
    let app;
    let host;
    afterEach(() => { app?.unmount(); host?.remove(); });

    function mount(file = s3, preferences = { s3: 's3CdnFileUrl', telegram: 'tgId', webdav: 'webdavPublicUrl' }, render = () => null) {
        const props = reactive({ file: { ...file, metadata: { ...file.metadata } }, modelValue: true, rootUrl: root, defaultFormat: 'mdUrl', contentPreferences: preferences });
        // Use the real component state, computed values and watchers without UI stubs.
        const component = { ...FileDetailDialog, render };
        app = createApp({ render: () => h(component, { ...props, ref: 'detail' }) });
        app.config.globalProperties.$t = key => key;
        host = document.createElement('div');
        document.body.appendChild(host);
        const vm = app.mount(host).$refs.detail;
        return { vm, props };
    }

    it('defaults to channel preference, switches all formats, and restores preference on reopen', async () => {
        const { vm, props } = mount();
        expect(vm.availableContents).toEqual(['originUrl', 's3Location', 's3CdnFileUrl']);
        expect(vm.linkEntries).toHaveLength(4);
        expect(vm.activeTab).toBe('mdUrl');
        expect(vm.linkEntries[0].value).toBe(s3.metadata.S3CdnFileUrl);
        vm.activeTab = 'htmlUrl';
        vm.selectedContent = 's3Location';
        expect(vm.activeTab).toBe('htmlUrl');
        expect(vm.linkEntries[1].value).toBe('![照片.png](https://bucket.example/photo.png)');
        expect(props.contentPreferences.s3).toBe('s3CdnFileUrl');
        props.modelValue = false;
        await nextTick();
        props.modelValue = true;
        await nextTick();
        expect(vm.selectedContent).toBe('s3CdnFileUrl');
        expect(vm.activeTab).toBe('mdUrl');
    });

    it('shows one field for Telegram IDs and resets temporary choices when moving to another file', async () => {
        const { vm, props } = mount(telegram);
        expect(vm.linkEntries).toEqual([{ key: 'tgId', label: 'settings.tgFileId', value: 'opaque-file-id' }]);
        expect(vm.activeTab).toBe('tgId');
        vm.selectedContent = 'originUrl';
        expect(vm.linkEntries).toHaveLength(4);
        expect(vm.activeTab).toBe('mdUrl');
        vm.activeTab = 'bbUrl';
        vm.selectedContent = 'tgId';
        expect(vm.activeTab).toBe('tgId');
        vm.selectedContent = 'originUrl';
        expect(vm.activeTab).toBe('bbUrl');
        props.file = webdav;
        await nextTick();
        expect(vm.selectedContent).toBe('webdavPublicUrl');
        expect(vm.activeTab).toBe('mdUrl');
        expect(vm.linkEntries[0].value).toBe(webdav.metadata.WebDAVPublicUrl);
    });

    it('reacts to metadata losing a configured public URL', async () => {
        const { vm, props } = mount(webdav);
        delete props.file.metadata.WebDAVPublicUrl;
        await nextTick();
        expect(vm.contentFallback).toBe(true);
        expect(vm.selectedContent).toBe('originUrl');
        expect(vm.linkEntries[0].value).toBe(`${root}wd.png`);
    });

    it('keeps hover expansion temporary, pins it on click, and resets when the dialog reopens', async () => {
        const { vm, props } = mount();
        expect(vm.actionsExpanded).toBe(false);
        vm.actionsHovered = true;
        expect(vm.actionsExpanded).toBe(true);
        vm.actionsHovered = false;
        expect(vm.actionsExpanded).toBe(false);
        vm.actionsHovered = true;
        vm.toggleActions();
        vm.actionsHovered = false;
        expect(vm.actionsExpanded).toBe(true);
        props.modelValue = false;
        await nextTick();
        props.modelValue = true;
        await nextTick();
        expect(vm.actionsExpanded).toBe(false);
    });

    it('updates dialog width and table columns when an open dialog crosses the mobile breakpoint', async () => {
        const { vm } = mount();
        const originalWidth = window.innerWidth;
        try {
            window.innerWidth = 768;
            window.dispatchEvent(new Event('resize'));
            await nextTick();
            expect(vm.dialogWidth).toBe('95%');
            expect(vm.descColumn).toBe(1);
            window.innerWidth = 1024;
            window.dispatchEvent(new Event('resize'));
            await nextTick();
            expect(vm.dialogWidth).toBe('min(900px, 94vw)');
            expect(vm.descColumn).toBe(2);
        } finally {
            window.innerWidth = originalWidth;
            window.dispatchEvent(new Event('resize'));
        }
    });

    it('uses portrait media beside a single-column table only when the viewport is wide enough', async () => {
        const { vm, props } = mount({ name: 'portrait.jpg', metadata: { FileType: 'image/jpeg', Width: 800, Height: 1200 } });
        const originalWidth = window.innerWidth;
        try {
            window.innerWidth = 1440;
            window.dispatchEvent(new Event('resize'));
            await nextTick();
            expect(vm.previewLayout).toBe('portrait');
            expect(vm.sideBySide).toBe(true);
            expect(vm.dialogWidth).toBe('min(1080px, 94vw)');
            expect(vm.descColumn).toBe(1);
            window.innerWidth = 900;
            window.dispatchEvent(new Event('resize'));
            await nextTick();
            expect(vm.sideBySide).toBe(false);
            expect(vm.descColumn).toBe(2);
            props.file = { name: 'landscape.jpg', metadata: { FileType: 'image/jpeg', Width: 1200, Height: 800 } };
            await nextTick();
            expect(vm.previewLayout).toBe('landscape');
        } finally {
            window.innerWidth = originalWidth;
            window.dispatchEvent(new Event('resize'));
        }
    });

    it('detects orientation from loaded media and clears dimensions and errors when switching files', async () => {
        const { vm, props } = mount({ name: 'unknown.jpg', metadata: { FileType: 'image/jpeg' } });
        expect(vm.previewLayout).toBe('landscape');
        vm.handleMediaLoad({ target: { naturalWidth: 600, naturalHeight: 1000 } });
        expect(vm.previewLayout).toBe('portrait');
        vm.previewFailed = true;
        expect(vm.previewLayout).toBe('file');
        props.file = { name: 'clip.mp4', metadata: { FileType: 'video/mp4' } };
        await nextTick();
        expect(vm.previewFailed).toBe(false);
        expect(vm.previewLayout).toBe('landscape');
        vm.handleMediaLoad({ target: { videoWidth: 360, videoHeight: 640 } });
        expect(vm.previewLayout).toBe('portrait');
        props.fileLink = '/another-video.mp4';
        await nextTick();
        expect(vm.loadedMediaSize).toBeNull();
    });

    it('uses compact layouts for audio and ordinary files and retries failed previews on reopen', async () => {
        const { vm, props } = mount({ name: 'track.mp3', metadata: { FileType: 'audio/mpeg', Width: 600, Height: 1000 } });
        expect(vm.previewLayout).toBe('audio');
        expect(vm.sideBySide).toBe(false);
        vm.previewFailed = true;
        expect(vm.previewLayout).toBe('file');
        props.modelValue = false;
        await nextTick();
        props.modelValue = true;
        await nextTick();
        expect(vm.previewLayout).toBe('audio');
        props.file = { name: 'document.pdf', metadata: { FileType: 'application/pdf', Width: 600, Height: 1000 } };
        await nextTick();
        expect(vm.previewLayout).toBe('file');
        expect(vm.sideBySide).toBe(false);
    });

    it('preserves learned portrait dimensions when reopening the same cached image without another load event', async () => {
        const { vm, props } = mount({ name: 'cached.jpg', metadata: { FileType: 'image/jpeg' } });
        vm.handleMediaLoad({ target: { naturalWidth: 600, naturalHeight: 1000 } });
        for (let attempt = 0; attempt < 3; attempt++) {
            props.modelValue = false;
            await nextTick();
            document.dispatchEvent(new Event('visibilitychange'));
            props.modelValue = true;
            await nextTick();
            await nextTick();
            expect(vm.loadedMediaSize).toEqual({ Width: 600, Height: 1000 });
            expect(vm.previewLayout).toBe('portrait');
        }
    });

    it('resets only the detail body scroll on reopen and when switching files', async () => {
        const { props } = mount(s3, {}, function () {
            return h('div', { class: 'el-dialog__body' }, [h('div', { ref: 'detailStart' })]);
        });
        const body = host.querySelector('.el-dialog__body');
        host.scrollTop = 90;
        body.scrollTop = 240;
        body.scrollLeft = 30;
        props.modelValue = false;
        await nextTick();
        props.modelValue = true;
        await nextTick();
        await nextTick();
        expect(body.scrollTop).toBe(0);
        expect(body.scrollLeft).toBe(0);
        expect(host.scrollTop).toBe(90);
        body.scrollTop = 180;
        props.file = webdav;
        await nextTick();
        await nextTick();
        expect(body.scrollTop).toBe(0);
    });

    it('recovers dimensions from an existing image node and ignores detached media events', async () => {
        const { vm } = mount({ name: 'cached.jpg', metadata: { FileType: 'image/jpeg' } }, {}, function () {
            return h('div', { ref: 'previewContent' }, [h('div', { class: 'image-preview' }, [h('img')])]);
        });
        const image = host.querySelector('img');
        Object.defineProperties(image, { naturalWidth: { value: 600 }, naturalHeight: { value: 1000 } });
        await vm.resetDetailView();
        expect(vm.previewLayout).toBe('portrait');
        const oldImage = document.createElement('img');
        Object.defineProperties(oldImage, { naturalWidth: { value: 1200 }, naturalHeight: { value: 800 } });
        vm.handleMediaLoad({ target: oldImage });
        expect(vm.previewLayout).toBe('portrait');
    });
});
