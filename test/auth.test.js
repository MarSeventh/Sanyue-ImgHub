import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTokenDefaults, computeExpiresAt, getTokenStatus } from '@/utils/tokenExpiration';

const { commit, push } = vi.hoisted(() => ({ commit: vi.fn(), push: vi.fn() }));
vi.mock('@/store', () => ({ default: { commit } }));
vi.mock('@/router', () => ({ default: { push } }));
import fetchWithAuth from '@/utils/fetchWithAuth';

afterEach(() => {
    commit.mockReset();
    push.mockReset();
});

describe('authenticated requests', () => {
    it.each(['production', 'development'])('includes session cookies and preserves request options in %s', async environment => {
        vi.stubEnv('NODE_ENV', environment);
        const response = new Response('{}');
        const fetch = vi.fn().mockResolvedValue(response);
        vi.stubGlobal('fetch', fetch);
        const controller = new AbortController();
        const options = { method: 'PATCH', body: '{}', headers: { 'Content-Type': 'application/json' }, signal: controller.signal };
        expect(await fetchWithAuth('/api/manage/metadata/a.png', options)).toBe(response);
        expect(fetch).toHaveBeenCalledWith(environment === 'production' ? '/api/manage/metadata/a.png' : '/api/api/manage/metadata/a.png', {
            ...options, credentials: 'include',
        });
        expect(push).not.toHaveBeenCalled();
    });

    it('redirects once for concurrent 401 responses and permits a later redirect after navigation finishes', async () => {
        let finishNavigation;
        const navigation = new Promise(resolve => { finishNavigation = resolve; });
        push.mockReturnValue(navigation);
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(null, { status: 401 })));
        const responses = await Promise.all([fetchWithAuth('/api/manage/list'), fetchWithAuth('/api/manage/list')]);
        expect(responses.map(response => response.status)).toEqual([401, 401]);
        expect(commit).toHaveBeenCalledExactlyOnceWith('setAdminLoggedIn', false);
        expect(push).toHaveBeenCalledExactlyOnceWith('/adminLogin');
        finishNavigation();
        await navigation;
        push.mockResolvedValue(undefined);
        await fetchWithAuth('/api/manage/list');
        expect(push).toHaveBeenCalledTimes(2);
    });

    it('returns forbidden responses without clearing login state', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
        expect((await fetchWithAuth('/api/manage/list')).status).toBe(403);
        expect(commit).not.toHaveBeenCalled();
        expect(push).not.toHaveBeenCalled();
    });

    it('propagates a network failure to the caller', async () => {
        const error = new TypeError('fetch failed');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
        await expect(fetchWithAuth('/api/manage/list')).rejects.toBe(error);
        expect(push).not.toHaveBeenCalled();
    });
});

describe('token lifetime', () => {
    it('computes duration and UTC calendar expiry without mutating the input date', () => {
        const base = new Date('2026-01-15T12:00:00Z');
        expect(computeExpiresAt(base, 2, 'h')).toBe('2026-01-15T14:00:00.000Z');
        expect(computeExpiresAt(base, 1, 'M')).toBe('2026-02-15T12:00:00.000Z');
        expect(computeExpiresAt(base, 1, 'Y')).toBe('2027-01-15T12:00:00.000Z');
        expect(base.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    });

    it('rejects invalid durations and units', () => {
        for (const value of [0, -1, NaN, Infinity]) expect(() => computeExpiresAt(new Date(), value, 'd')).toThrow();
        expect(() => computeExpiresAt(new Date(), 1, 'invalid')).toThrow();
    });

    it('keeps the existing strict expiry boundary and supports tokens without expiry', () => {
        const expiresAt = '2026-01-15T12:00:00.000Z';
        expect(getTokenStatus(expiresAt, new Date(expiresAt)).status).toBe('active');
        expect(getTokenStatus(expiresAt, new Date('2026-01-15T12:00:00.001Z')).status).toBe('expired');
        expect(getTokenStatus(null).status).toBe('active');
    });

    it('adds legacy defaults without changing supplied expiry or auto-delete preferences', () => {
        const legacy = { token: 'test-token' };
        expect(applyTokenDefaults(legacy)).toEqual({ ...legacy, expiresAt: null, autoDelete: false });
        expect(legacy).toEqual({ token: 'test-token' });
        const current = { expiresAt: '2027-01-01', autoDelete: true };
        expect(applyTokenDefaults(current)).toEqual(current);
    });
});
