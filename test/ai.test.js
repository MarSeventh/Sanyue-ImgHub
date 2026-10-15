import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/fetchWithAuth', () => ({ default: vi.fn() }));
import fetchWithAuth from '@/utils/fetchWithAuth';
import { apiJSON, applyTagSuggestions, generateTagSuggestions, makeImagePreview } from '@/utils/aiTags';

beforeEach(() => {
    fetchWithAuth.mockReset();
});

describe('AI requests and suggestions', () => {
    it('maps a non-JSON login response to an authentication error', async () => {
        fetchWithAuth.mockResolvedValue(new Response('login', { status: 401 }));
        await expect(apiJSON('/api/manage/ai/tags')).rejects.toMatchObject({ code: 'AUTH_REQUIRED', details: { status: 401 } });
    });

    it('preserves structured backend errors and rejects invalid JSON shapes', async () => {
        fetchWithAuth.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'AI_DISABLED', message: 'disabled' } }), { status: 503 }));
        await expect(apiJSON('/api/manage/ai/tags')).rejects.toMatchObject({ code: 'AI_DISABLED', details: { status: 503 } });
        fetchWithAuth.mockResolvedValueOnce(new Response('[]'));
        await expect(apiJSON('/api/manage/ai/tags')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    });

    it('rejects unsupported, oversized or cancelled preview input before fetching', async () => {
        await expect(makeImagePreview({ name: 'a.svg', metadata: { FileType: 'image/svg+xml' } })).rejects.toThrow('UNSUPPORTED_IMAGE');
        await expect(makeImagePreview({ name: 'a.png', metadata: { FileType: 'image/png', FileSizeBytes: 21 * 1024 * 1024 } })).rejects.toThrow('IMAGE_TOO_LARGE');
        const controller = new AbortController();
        controller.abort();
        await expect(makeImagePreview({ name: 'a.png' }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it('uses shared MIME completion while retaining AI-specific format limits', async () => {
        await expect(makeImagePreview({ name: 'a.svg', metadata: { FileType: 'application/octet-stream' } })).rejects.toThrow('UNSUPPORTED_IMAGE');
        await expect(makeImagePreview({ name: 'a.png', metadata: { FileType: 'application/pdf' } })).rejects.toThrow('UNSUPPORTED_IMAGE');
        await expect(makeImagePreview({ name: 'a.PNG', metadata: { FileType: 'application/octet-stream', FileSizeBytes: 21 * 1024 * 1024 } })).rejects.toThrow('IMAGE_TOO_LARGE');
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it('still fetches extensionless historical records when no MIME can be inferred', async () => {
        fetchWithAuth.mockResolvedValue(new Response('missing', { status: 404 }));
        await expect(makeImagePreview({ name: 'opaque-id' })).rejects.toMatchObject({ code: 'IMAGE_FETCH_FAILED' });
        expect(fetchWithAuth).toHaveBeenCalledWith('/file/opaque-id', { signal: undefined });
    });

    it('does not send failed previews and reports both failed and successful files', async () => {
        const onResult = vi.fn();
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ results: [{ fileId: 'good.png', tags: ['nature'], sourceIdentity: 'a'.repeat(64) }] })));
        const results = await generateTagSuggestions([{ name: 'bad.png' }, { name: 'good.png' }], {
            onResult,
            prepare: async file => {
                if (file.name === 'bad.png') throw new Error('UNSUPPORTED_IMAGE');
                return new Blob(['preview'], { type: 'image/jpeg' });
            },
        });
        expect(results[0]).toMatchObject({ fileId: 'bad.png', error: { code: 'UNSUPPORTED_IMAGE' } });
        expect(results[1]).toMatchObject({ fileId: 'good.png', tags: ['nature'] });
        const [url, options] = fetchWithAuth.mock.calls[0];
        expect(url).toBe('/api/manage/ai/tags');
        expect(JSON.parse(options.body.get('items'))).toEqual([{ fileId: 'good.png' }]);
        expect(options.body.get('image0').type).toBe('image/jpeg');
        expect(onResult).toHaveBeenCalledTimes(2);
    });

    it('rejects mismatched response file IDs instead of attaching another file’s tags', async () => {
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ results: [{ fileId: 'other.png', tags: ['wrong'], sourceIdentity: 'a'.repeat(64) }] })));
        const [result] = await generateTagSuggestions([{ name: 'requested.png' }], { prepare: async () => new Blob(['preview']) });
        expect(result).toMatchObject({ fileId: 'requested.png', error: { code: 'INVALID_RESPONSE' } });
        expect(result.tags).toBeUndefined();
    });

    it('applies suggestions in batches of 50 and retains per-file backend results', async () => {
        const items = Array.from({ length: 51 }, (_, index) => ({ fileId: `${index}.png`, tags: ['tag'], sourceIdentity: 'a'.repeat(64) }));
        fetchWithAuth.mockImplementation(async (url, options) => {
            const batch = JSON.parse(options.body).items;
            return new Response(JSON.stringify({ results: batch.map(item => ({ fileId: item.fileId, saved: true, tags: item.tags })) }));
        });
        const results = await applyTagSuggestions(items);
        expect(results).toHaveLength(51);
        expect(results.every(result => result.saved)).toBe(true);
        expect(fetchWithAuth.mock.calls.map(([, options]) => JSON.parse(options.body).items.length)).toEqual([50, 1]);
    });

    it('does not report a malformed apply response as a successful save', async () => {
        fetchWithAuth.mockResolvedValue(new Response(JSON.stringify({ results: [{ fileId: 'wrong.png', saved: true, tags: [] }] })));
        expect(await applyTagSuggestions([{ fileId: 'requested.png', tags: ['tag'] }])).toEqual([
            expect.objectContaining({ fileId: 'requested.png', saved: false, error: expect.objectContaining({ code: 'INVALID_RESPONSE' }) }),
        ]);
    });
});
