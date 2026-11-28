import { afterEach, describe, expect, it } from 'vitest';
import { createApp, nextTick } from 'vue';
import Dashboard from '@/views/AdminDashBoard.vue';

let app;
afterEach(() => {
    app?.unmount();
    app = null;
    document.body.replaceChildren();
});

function mountSelection(files) {
    const host = document.createElement('div');
    document.body.append(host);
    app = createApp({
        data: () => ({ tableData: files, selectedFiles: [] }),
        computed: { selectedTableFiles: Dashboard.computed.selectedTableFiles },
        watch: { selectedTableFiles: Dashboard.watch.selectedTableFiles },
        render: () => null,
    });
    return app.mount(host);
}

const file = name => ({ name, selected: false, metadata: { Tags: ['photo'] } });

describe('dashboard selected files', () => {
    it('preserves selection order across pages, deselection, and re-selection', async () => {
        const vm = mountSelection([file('first'), file('second'), file('third')]);
        vm.tableData[2].selected = true;
        await nextTick();
        vm.tableData[0].selected = true;
        await nextTick();
        vm.tableData[1].selected = true;
        await nextTick();
        expect(vm.selectedFiles.map(item => item.name)).toEqual(['third', 'first', 'second']);

        vm.tableData[0].selected = false;
        await nextTick();
        vm.tableData[0].selected = true;
        await nextTick();
        expect(vm.selectedFiles.map(item => item.name)).toEqual(['third', 'second', 'first']);
    });

    it('drops removed records, uses replacement records, and distinguishes folders from files', async () => {
        const vm = mountSelection([file('same'), { ...file('same'), isFolder: true }]);
        vm.tableData.forEach(item => { item.selected = true; });
        await nextTick();
        expect(vm.selectedFiles).toHaveLength(2);

        vm.tableData.splice(0, 1);
        await nextTick();
        expect(vm.selectedFiles).toEqual([vm.tableData[0]]);
        const oldFolder = vm.selectedFiles[0];
        vm.tableData = [{ ...file('same'), isFolder: true, selected: true }, file('new')];
        await nextTick();
        expect(vm.selectedFiles).toEqual([vm.tableData[0]]);
        expect(vm.selectedFiles[0]).not.toBe(oldFolder);

        vm.tableData.forEach(item => { item.selected = false; });
        await nextTick();
        expect(vm.selectedFiles).toEqual([]);
    });

    it('does not traverse metadata when selecting or rebuild selection after metadata and preview edits', async () => {
        let metadataReads = 0;
        const entry = file('image');
        Object.defineProperty(entry.metadata, 'details', {
            enumerable: true,
            get() { metadataReads++; return { channel: 'S3' }; },
        });
        const vm = mountSelection([entry]);
        vm.tableData[0].selected = true;
        await nextTick();
        expect(metadataReads).toBe(0);

        const selection = vm.selectedFiles;
        vm.tableData[0].metadata.Tags.push('updated');
        vm.tableData[0].previewSrcList = ['first.svg', 'second.svg'];
        await nextTick();
        expect(vm.selectedFiles).toBe(selection);
        expect(vm.selectedFiles[0].metadata.Tags).toEqual(['photo', 'updated']);
    });
});
