import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, compileTemplate } from '@vue/compiler-sfc';
vi.mock('@/utils/fetchWithAuth', () => ({ default: vi.fn() }));
import SysCogStatus from '@/components/config/SysCogStatus.vue';
import fetchWithAuth from '@/utils/fetchWithAuth';

// Compile the real template and exercise scan state transitions with mocked HTTP.
const source = readFileSync(resolve(process.cwd(), 'src/components/config/SysCogStatus.vue'), 'utf8');
const { descriptor, errors } = parse(source, { filename: 'SysCogStatus.vue' });
const compiled = compileTemplate({ source: descriptor.template.content, filename: 'SysCogStatus.vue', id: 'dup-scan-ui' });
const templateCode = compiled.code;

function jsonResponse(payload, status = 200) {
    return { ok: status < 400, status, json: async () => payload };
}

function context(extra = {}) {
    const vm = {
        dupScanLoading: false,
        dupScanSupported: true,
        dupScanVisible: false,
        dupScanReport: null,
        isProcessing: false,
        $t: key => key,
        $message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
        ...extra,
    };
    vm.scanDuplicates = SysCogStatus.methods.scanDuplicates.bind(vm);
    vm.checkScanCapability = SysCogStatus.methods.checkScanCapability.bind(vm);
    return vm;
}

const baseReport = {
    scanned: 3,
    complete: true,
    timedOut: false,
    chunkErrors: [],
    recordErrors: [],
    readErrors: [],
    skippedOversized: [],
    readableChannels: ['CloudflareR2'],
    duplicateGroups: [{ sha256: 'aa', count: 2, keep: { id: 'old.png' }, duplicates: [{ id: 'new.png' }] }],
    redundantCopies: 1,
};

beforeEach(() => {
    fetchWithAuth.mockReset();
});

describe('duplicate scan template wiring', () => {
    it('compiles the report dialog with Element Plus v-model outside any progress branch', () => {
        expect(errors).toEqual([]);
        expect(templateCode).toContain('onUpdate:modelValue');
        expect(templateCode).not.toContain(':visible.sync');
    });

    it('guards the scan entry with disabled or loading and keeps the trigger wrapper for tooltips', () => {
        expect(templateCode).toContain('dup-scan-trigger');
        expect(templateCode).toContain('dupScanSupported');
        expect(templateCode).toContain('dupScanLoading');
    });

    it('switches the tooltip between the run hint and the unsupported reason', () => {
        expect(templateCode).toContain('dupScanTooltip');
        expect(templateCode).toContain('dupScanUnsupportedTooltip');
    });

    it('moves the read-only and deployment scope text into a question icon tooltip', () => {
        expect(templateCode).toContain('question-circle');
        expect(templateCode).toContain('dupScanScopeTip');
        expect(templateCode).not.toContain('dupScanNotice');
        expect(templateCode).not.toContain('dupScanServerOnly');
    });

    it('shows the unknown-keep-timestamp flag on the group header', () => {
        expect(templateCode).toContain('keepTimestampUnknown');
        expect(templateCode).toContain('dupScanKeepUnknownTime');
    });
});

describe('duplicate scan interactions', () => {
    it('opens the report on success and normalizes a shape-shifting response', async () => {
        const vm = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ ...baseReport, readErrors: undefined, recordErrors: undefined, chunkErrors: undefined, skippedOversized: undefined }));
        await vm.scanDuplicates();
        expect(fetchWithAuth).toHaveBeenCalledWith('/api/manage/dedup/scan', { method: 'POST' });
        expect(vm.dupScanVisible).toBe(true);
        expect(vm.dupScanReport.readErrors).toEqual([]);
        expect(vm.dupScanReport.recordErrors).toEqual([]);
        expect(vm.dupScanReport.chunkErrors).toEqual([]);
        expect(vm.dupScanReport.skippedOversized).toEqual([]);
        expect(vm.dupScanLoading).toBe(false);
    });

    it('distinguishes a clean full sweep from a partial scan on the report object', async () => {
        const clean = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ ...baseReport, duplicateGroups: [], redundantCopies: 0 }));
        await clean.scanDuplicates();
        expect(clean.dupScanVisible).toBe(true);
        expect(clean.dupScanReport.complete).toBe(true);

        const partial = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({
            ...baseReport,
            complete: false,
            timedOut: true,
            indexChanged: true,
            duplicateGroups: [],
            redundantCopies: 0,
            readErrors: [{ id: 'tg.png', error: 'content not readable via storage binding' }],
        }));
        await partial.scanDuplicates();
        expect(partial.dupScanVisible).toBe(true);
        expect(partial.dupScanReport.complete).toBe(false);
        expect(partial.dupScanReport.timedOut).toBe(true);
        expect(partial.dupScanReport.indexChanged).toBe(true);
        // 模板的不完整警告条件同时覆盖 complete:false 与 skipped/record 失败
        expect(templateCode).toContain('complete === false');
    });

    it('locks the entry when the mount-time probe reports 501', async () => {
        const vm = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ supported: false, error: 'unsupported deployment' }, 501));
        await vm.checkScanCapability();
        expect(vm.dupScanSupported).toBe(false);

        const supported = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ supported: true }, 200));
        await supported.checkScanCapability();
        expect(supported.dupScanSupported).toBe(true);

        fetchWithAuth.mockResolvedValue(jsonResponse({ supported: false }, 200));
        await supported.checkScanCapability();
        expect(supported.dupScanSupported).toBe(false);

        // 其它失败(旧后端 404)不误判为不支持
        const unknownBackend = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ error: 'not found' }, 404));
        await unknownBackend.checkScanCapability();
        expect(unknownBackend.dupScanSupported).toBe(true);
    });

    it('downgrades the entry to unsupported when a POST comes back 501', async () => {
        const vm = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ supported: false, error: 'unsupported deployment' }, 501));
        await vm.scanDuplicates();
        expect(vm.dupScanSupported).toBe(false);
        expect(vm.$message.warning).toHaveBeenCalled();
        expect(vm.dupScanVisible).toBe(false);
        expect(vm.dupScanLoading).toBe(false);
    });

    it('resets state and reports the failure when the scan request fails', async () => {
        const vm = context();
        fetchWithAuth.mockRejectedValue(new TypeError('network down'));
        await vm.scanDuplicates();
        expect(vm.$message.error).toHaveBeenCalled();
        expect(vm.dupScanVisible).toBe(false);
        expect(vm.dupScanLoading).toBe(false);

        const httpError = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
        await httpError.scanDuplicates();
        expect(httpError.$message.error).toHaveBeenCalled();
        expect(httpError.dupScanVisible).toBe(false);
    });

    it('rejects an unexpected response shape instead of rendering a broken report', async () => {
        const vm = context();
        fetchWithAuth.mockResolvedValue(jsonResponse({ ...baseReport, duplicateGroups: [{ keep: null, duplicates: [] }] }, 200));
        await vm.scanDuplicates();
        expect(vm.$message.error).toHaveBeenCalled();
        expect(vm.dupScanVisible).toBe(false);
        expect(vm.dupScanReport).toBe(null);
    });

    it('prevents a second trigger while a scan is in flight', async () => {
        const vm = context();
        let resolveFetch;
        fetchWithAuth.mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
        const first = vm.scanDuplicates();
        expect(vm.dupScanLoading).toBe(true);
        await vm.scanDuplicates();
        expect(fetchWithAuth).toHaveBeenCalledTimes(1);
        resolveFetch(jsonResponse(baseReport));
        await first;
        expect(vm.dupScanLoading).toBe(false);
    });
});
