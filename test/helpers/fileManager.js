import { beforeEach, vi } from 'vitest';

const { fetchWithAuth, warning } = vi.hoisted(() => ({ fetchWithAuth: vi.fn(), warning: vi.fn() }));
vi.mock('@/utils/fetchWithAuth', () => ({ default: fetchWithAuth }));
vi.mock('element-plus', () => ({ ElMessage: { warning } }));
vi.mock('@/locales', () => ({ default: { global: { t: key => key } } }));

import { fileManager } from '@/utils/fileManager';

beforeEach(() => {
    localStorage.clear();
    fetchWithAuth.mockReset();
    warning.mockReset();
    fileManager.fileListCache = null;
    fileManager.storageWarningShown = false;
});

export { fetchWithAuth, warning };
