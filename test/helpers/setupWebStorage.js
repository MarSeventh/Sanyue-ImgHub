// Some Node versions/flags expose unavailable Web Storage globals that can
// shadow happy-dom storage. Preserve working storage and install an in-memory
// fallback when property access or a read/write probe fails.
for (const name of ['localStorage', 'sessionStorage']) {
    let functional = false;
    try {
        const existing = globalThis[name];
        const probeKey = '__imgbed_storage_probe__';
        const previous = existing.getItem(probeKey);
        try {
            existing.setItem(probeKey, '1');
            functional = existing.getItem(probeKey) === '1';
        } finally {
            if (previous === null) existing.removeItem(probeKey);
            else existing.setItem(probeKey, previous);
        }
    } catch {
        functional = false;
    }
    if (functional) continue;

    const store = new Map();
    Object.defineProperty(globalThis, name, {
        configurable: true,
        value: {
            getItem(key) {
                key = String(key);
                return store.has(key) ? store.get(key) : null;
            },
            setItem(key, value) {
                store.set(String(key), String(value));
            },
            removeItem(key) {
                store.delete(String(key));
            },
            clear() {
                store.clear();
            },
            key(index) {
                return [...store.keys()][index] ?? null;
            },
            get length() {
                return store.size;
            },
        },
    });
}
