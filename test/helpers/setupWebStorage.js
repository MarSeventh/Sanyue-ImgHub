// Node >= 22 exposes an experimental `localStorage` global whose accessor
// resolves to undefined unless the process runs with --localstorage-file.
// Because vitest populates the happy-dom window INTO globalThis
// (globalThis === window), that non-functional Node accessor shadows the
// happy-dom storage implementation, leaving every test without a working
// localStorage/sessionStorage. Install a plain in-memory web storage when
// the active value cannot round-trip a key.
for (const name of ['localStorage', 'sessionStorage']) {
    const existing = globalThis[name];
    let functional = false;
    try {
        existing.setItem('__probe__', '1');
        functional = existing.getItem('__probe__') === '1';
        existing.removeItem('__probe__');
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
