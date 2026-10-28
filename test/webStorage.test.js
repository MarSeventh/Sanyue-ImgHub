import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const setup = readFileSync('test/helpers/setupWebStorage.js', 'utf8');

describe('test Web Storage initialization', () => {
    it.each(['missing', 'undefined', 'throwing getter', 'broken methods'])('recovers from %s storage', kind => {
        const sandbox = {};
        for (const name of ['localStorage', 'sessionStorage']) {
            if (kind === 'undefined') Object.defineProperty(sandbox, name, { configurable: true, get: () => undefined });
            if (kind === 'throwing getter') Object.defineProperty(sandbox, name, { configurable: true, get() { throw new Error('storage unavailable'); } });
            if (kind === 'broken methods') sandbox[name] = { getItem() { throw new Error('storage unavailable'); } };
        }
        vm.runInNewContext(setup, sandbox);
        for (const name of ['localStorage', 'sessionStorage']) {
            const storage = sandbox[name];
            expect(storage.getItem('absent')).toBeNull();
            storage.setItem(7, 42);
            expect(storage.getItem('7')).toBe('42');
            expect(storage.length).toBe(1);
            expect(storage.key(0)).toBe('7');
            expect(storage.key(1)).toBeNull();
            storage.removeItem(7);
            expect(storage.length).toBe(0);
            storage.setItem('clear-me', 'x');
            storage.clear();
            expect(storage.length).toBe(0);
        }
        sandbox.localStorage.setItem('only-local', 'value');
        expect(sandbox.sessionStorage.getItem('only-local')).toBeNull();
    });

    it('preserves working storage instances and existing probe values', () => {
        const values = new Map([['__imgbed_storage_probe__', 'keep'], ['other', 'value']]);
        const storage = {
            getItem: key => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
            removeItem: key => values.delete(key),
        };
        const sandbox = { localStorage: storage, sessionStorage: storage };
        vm.runInNewContext(setup, sandbox);
        expect(sandbox.localStorage).toBe(storage);
        expect(sandbox.sessionStorage).toBe(storage);
        expect([...values]).toEqual([['__imgbed_storage_probe__', 'keep'], ['other', 'value']]);
    });
});
