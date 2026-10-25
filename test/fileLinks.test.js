import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, h, nextTick, reactive } from 'vue';
import * as Vue from 'vue';
import { readFileSync } from 'node:fs';
import { parse } from 'vue/compiler-sfc';
import { compile } from '@vue/compiler-dom';
import { ElDescriptions, ElDescriptionsItem, ElTag } from 'element-plus';
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

    function mount(file = s3, preferences = { s3: 's3CdnFileUrl', telegram: 'tgId', webdav: 'webdavPublicUrl' }, render = () => null, renderMetadata = false) {
        const props = reactive({ file: { ...file, metadata: { ...file.metadata } }, modelValue: true, rootUrl: root, defaultFormat: 'mdUrl', contentPreferences: preferences });
        // Exercise real component state; render metadata widgets when checking DOM reuse.
        const component = { ...FileDetailDialog, render };
        app = createApp({ render: () => h(component, { ...props, ref: 'detail' }) });
        app.config.globalProperties.$t = key => key;
        if (renderMetadata) {
            // Render the actual metadata widgets; unrelated dialog controls only supply slots.
            for (const name of ['ElDialog', 'ElButton', 'ElTabs', 'ElTabPane', 'ElInput', 'ElRadioGroup', 'ElRadio', 'ElImage', 'ElForm', 'ElFormItem', 'FontAwesomeIcon']) {
                app.component(name, { render() { return h('div', this.$slots.default?.()); } });
            }
            app.component('ElDescriptions', ElDescriptions);
            app.component('ElDescriptionsItem', ElDescriptionsItem);
            app.component('ElTag', ElTag);
        }
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
            expect(vm.dialogWidth).toBe('min(1080px, 94vw)');
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
        expect(vm.previewLoading).toBe(true);
        expect(vm.previewLayout).toBe('landscape');
        vm.handleMediaLoad({ target: { naturalWidth: 600, naturalHeight: 1000 } });
        expect(vm.previewLoading).toBe(false);
        expect(vm.previewLayout).toBe('portrait');
        vm.previewFailed = true;
        expect(vm.previewLayout).toBe('file');
        props.file = { name: 'clip.mp4', metadata: { FileType: 'video/mp4' } };
        await nextTick();
        expect(vm.previewFailed).toBe(false);
        expect(vm.previewLoading).toBe(true);
        expect(vm.previewLayout).toBe('landscape');
        vm.handleMediaLoad({ target: { videoWidth: 360, videoHeight: 640 } });
        expect(vm.previewLayout).toBe('portrait');
        // Metadata establishes orientation, but cannot yet display a video frame.
        expect(vm.previewLoading).toBe(true);
        vm.handleMediaReady({ target: { readyState: 2 } });
        expect(vm.previewLoading).toBe(false);
        props.fileLink = '/another-video.mp4';
        await nextTick();
        expect(vm.loadedMediaSize).toBeNull();
        expect(vm.previewLoading).toBe(true);
    });

    it('uses compact layouts for audio and ordinary files and retries failed previews on reopen', async () => {
        const { vm, props } = mount({ name: 'track.mp3', metadata: { FileType: 'audio/mpeg', Width: 600, Height: 1000 } });
        expect(vm.previewLayout).toBe('audio');
        expect(vm.previewLoading).toBe(true);
        vm.handleMediaReady({ target: { readyState: 2 } });
        expect(vm.previewLoading).toBe(false);
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
        expect(vm.previewLoading).toBe(false);
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
            expect(vm.previewLoading).toBe(false);
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
        vm.resetPreview();
        vm.handleMediaReady({ target: oldImage });
        vm.handleMediaError({ target: oldImage });
        expect(vm.mediaReady).toBe(false);
        expect(vm.previewFailed).toBe(false);
        vm.handleMediaError({ target: image });
        expect(vm.previewFailed).toBe(true);
        expect(vm.previewLoading).toBe(false);
    });

    it.each([true, false])('does not leave the old access badge in the dimensions cell after switching columns (dimensions: %s)', async dimensions => {
        const originalWidth = window.innerWidth;
        window.innerWidth = 1440;
        const source = readFileSync('src/components/dashboard/FileDetailDialog.vue', 'utf8');
        const { descriptor } = parse(source);
        const render = new Function('Vue', compile(descriptor.template.content, { prefixIdentifiers: true }).code)(Vue);
        try {
            const { vm, props } = mount({ name: 'landscape.jpg', metadata: { FileType: 'image/jpeg', Width: 1200, Height: 700 } }, {}, render, true);
            await nextTick();
            props.modelValue = false;
            await nextTick();
            props.file = { name: 'portrait.jpg', metadata: { FileType: 'image/jpeg', ...(dimensions ? { Width: 600, Height: 1200 } : {}) } };
            props.modelValue = true;
            await nextTick();
            // The no-dimensions case discovers portrait orientation from the loaded image.
            if (!dimensions) {
                const media = document.createElement('img');
                host.querySelector('.preview-content').append(media);
                Object.defineProperties(media, { naturalWidth: { value: 600 }, naturalHeight: { value: 1200 } });
                vm.handleMediaLoad({ target: media });
                await nextTick();
            }
            const table = host.querySelector('.file-detail-metadata');
            const label = [...table.querySelectorAll('.el-descriptions__label')].find(cell => cell.textContent === 'fileDetail.imageDimensions');
            const cell = label.nextElementSibling;
            expect(cell.textContent).toBe(dimensions ? '600 × 1200fileDetail.orientationPortrait' : 'fileDetail.noDimensions');
            expect(cell.querySelector('.el-tag--success')).toBeNull();
            expect(table.querySelector('.el-zoom-in-center-leave-active')).toBeNull();
        } finally {
            window.innerWidth = originalWidth;
            window.dispatchEvent(new Event('resize'));
        }
    });
});
