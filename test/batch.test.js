import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/fetchWithAuth', () => ({ default: vi.fn() }));
import fetchWithAuth from '@/utils/fetchWithAuth';
import BatchProcessor from '@/utils/batchProcessor';

beforeEach(() => {
    fetchWithAuth.mockReset();
});

describe('batch record retrieval', () => {
    it('follows encoded cursors, keeps values and reports cumulative progress', async () => {
        fetchWithAuth
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, records: [{ name: 'a.png', value: 'chunks' }], nextCursor: 'next+cursor/=' })))
            .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, records: [{ name: 'b.png' }] })));
        const onProgress = vi.fn();
        const processor = new BatchProcessor({ batchSize: 2, onProgress });
        expect(await processor.fetchAllRecords(true)).toEqual([{ name: 'a.png', value: 'chunks' }, { name: 'b.png' }]);
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        const params = new URL(fetchWithAuth.mock.calls[1][0], 'https://test').searchParams;
        expect(params.get('cursor')).toBe('next+cursor/=');
        expect(params.get('includeValue')).toBe('true');
        expect(params.get('limit')).toBe('2');
        expect(onProgress.mock.calls.map(([progress]) => progress.current)).toEqual([1, 2]);
        expect(fetchWithAuth.mock.calls[0][1].signal).toBe(processor.abortController.signal);
    });

    it.each([[401, 'AUTH_FAILED'], [403, 'FORBIDDEN'], [500, 'SERVER_ERROR']])('reports HTTP %i as %s', async (status, code) => {
        fetchWithAuth.mockResolvedValue(new Response('{}', { status }));
        const onError = vi.fn();
        const processor = new BatchProcessor({ onError });
        await expect(processor.fetchAllRecords()).rejects.toMatchObject({ code });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(fetchWithAuth).toHaveBeenCalledTimes(1);
    });

    it('reports API failures instead of treating them as an empty list', async () => {
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'bad cursor' })));
        await expect(new BatchProcessor().fetchAllRecords()).rejects.toMatchObject({ code: 'API_ERROR' });
    });

    it('cancels after a page and does not issue the next request', async () => {
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ success: true, records: [{ name: 'a.png' }], nextCursor: 'next' })));
        const processor = new BatchProcessor({ onProgress: () => processor.abort() });
        await expect(processor.fetchAllRecords()).rejects.toMatchObject({ code: 'ABORTED' });
        expect(fetchWithAuth).toHaveBeenCalledTimes(1);
        expect(processor.isAborted()).toBe(true);
        processor.reset();
        expect(processor.isAborted()).toBe(false);
    });
});
