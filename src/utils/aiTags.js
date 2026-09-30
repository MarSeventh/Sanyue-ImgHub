import fetchWithAuth from '@/utils/fetchWithAuth';

export const MAX_PREVIEW_BYTES = 256 * 1024;
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
function checkAbort(signal) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}

export function aiErrorText(error, translate, hasTranslation) {
    const code = error?.code || error?.message;
    const key = `aiErrors.${code}`;
    const message = hasTranslation(key)
        ? translate(key, { status: error.details?.status || error.status })
        : translate('aiErrors.NETWORK_ERROR');
    const details = ['code', 'type', 'requestId'].filter(field => error?.details?.[field])
        .map(field => `${translate(`aiErrors.${field}`)}: ${error.details[field]}`);
    return details.length ? `${message} (${details.join(', ')})` : message;
}

const errorResult = error => ({ code: error.code || error.message, message: error.message, ...(error.details ? { details: error.details } : {}) });

export async function apiJSON(url, options = {}) {
    const response = await fetchWithAuth(url, options);
    let data;
    try { data = await response.json(); }
    catch {
        const error = new Error(`HTTP ${response.status}`);
        error.code = response.status === 401 ? 'AUTH_REQUIRED' : response.ok ? 'INVALID_RESPONSE' : 'HTTP_ERROR';
        error.details = { status: response.status };
        throw error;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        const error = new Error('INVALID_RESPONSE');
        error.code = 'INVALID_RESPONSE';
        throw error;
    }
    if (!response.ok) {
        const error = new Error(data.error?.message || data.message || `HTTP ${response.status}`);
        error.code = data.error?.code || (response.status === 401 ? 'AUTH_REQUIRED' : 'HTTP_ERROR');
        error.details = { status: response.status, ...data.error?.details };
        throw error;
    }
    return data;
}

export async function makeImagePreview(file, signal) {
    checkAbort(signal);
    const type = file.metadata?.FileType?.toLowerCase();
    if (type && !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(type)) throw new Error('UNSUPPORTED_IMAGE');
    if (Number(file.metadata?.FileSizeBytes) > MAX_ORIGINAL_BYTES) throw new Error('IMAGE_TOO_LARGE');
    const path = file.name.split('/').map(encodeURIComponent).join('/');
    const response = await fetchWithAuth(`/file/${path}`, { signal });
    if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.code = 'IMAGE_FETCH_FAILED';
        error.details = { status: response.status };
        throw error;
    }
    if (Number(response.headers.get('Content-Length')) > MAX_ORIGINAL_BYTES) {
        await response.body?.cancel();
        throw new Error('IMAGE_TOO_LARGE');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            checkAbort(signal);
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_ORIGINAL_BYTES) { await reader.cancel(); throw new Error('IMAGE_TOO_LARGE'); }
            chunks.push(value);
        }
    } finally { reader.releaseLock(); }
    const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || type });
    checkAbort(signal);
    let image, objectUrl;
    try {
        if (typeof createImageBitmap === 'function') image = await createImageBitmap(blob);
        else {
            objectUrl = URL.createObjectURL(blob);
            image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('UNSUPPORTED_IMAGE'));
                image.src = objectUrl;
            });
        }
        checkAbort(signal);
        const width = image.width || image.naturalWidth;
        const height = image.height || image.naturalHeight;
        if (!width || !height) throw new Error('UNSUPPORTED_IMAGE');
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 768 / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.8, 0.6, 0.4]) {
            checkAbort(signal);
            const preview = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
            if (preview && preview.size <= MAX_PREVIEW_BYTES && (preview.size <= 128 * 1024 || quality === 0.4)) return preview;
        }
        throw new Error('PREVIEW_TOO_LARGE');
    } catch (error) {
        if (signal?.aborted || error.name === 'AbortError' || error.message === 'PREVIEW_TOO_LARGE') throw error;
        throw new Error('UNSUPPORTED_IMAGE');
    } finally {
        image?.close?.();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
}

export async function generateTagSuggestions(files, { signal, batchSize = 3, onResult, prepare = makeImagePreview } = {}) {
    batchSize = Math.max(1, Math.min(3, batchSize));
    const results = [];
    for (let start = 0; start < files.length; start += batchSize) {
        checkAbort(signal);
        const prepared = [];
        // Limit browser memory: only retain previews for the current small batch.
        for (const file of files.slice(start, start + batchSize)) {
            try { prepared.push({ file, image: await prepare(file, signal) }); }
            catch (error) {
                if (signal?.aborted || error.name === 'AbortError') throw error;
                const result = { fileId: file.name, error: errorResult(error) };
                results.push(result); onResult?.(result);
            }
        }
        checkAbort(signal);
        if (!prepared.length) continue;
        const form = new FormData();
        form.append('items', JSON.stringify(prepared.map(item => ({ fileId: item.file.name }))));
        prepared.forEach((item, index) => form.append(`image${index}`, item.image, 'preview.jpg'));
        try {
            const data = await apiJSON('/api/manage/ai/tags', { method: 'POST', body: form, signal });
            checkAbort(signal);
            if (!Array.isArray(data.results) || data.results.length !== prepared.length) throw new Error('INVALID_RESPONSE');
            for (let index = 0; index < prepared.length; index++) {
                const result = data.results[index];
                if (!result || result.fileId !== prepared[index].file.name || (!result.error && (!Array.isArray(result.tags) || result.tags.some(tag => typeof tag !== 'string') || !/^[a-f0-9]{64}$/.test(result.sourceIdentity)))) throw new Error('INVALID_RESPONSE');
            }
            for (const result of data.results) { results.push(result); onResult?.(result); }
        } catch (error) {
            if (signal?.aborted || error.name === 'AbortError') throw error;
            for (const item of prepared) {
                const result = { fileId: item.file.name, error: errorResult(error) };
                results.push(result); onResult?.(result);
            }
        }
    }
    return results;
}

export async function applyTagSuggestions(items, onResult) {
    const results = [];
    for (let start = 0; start < items.length; start += 50) {
        const batch = items.slice(start, start + 50);
        try {
            const data = await apiJSON('/api/manage/tags/apply', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: batch })
            });
            if (!Array.isArray(data.results) || data.results.length !== batch.length || data.results.some((result, index) => !result || result.fileId !== batch[index].fileId || typeof result.saved !== 'boolean' || (result.saved && (!Array.isArray(result.tags) || result.tags.some(tag => typeof tag !== 'string'))))) {
                throw new Error('INVALID_RESPONSE');
            }
            for (const result of data.results) { results.push(result); onResult?.(result); }
        } catch (error) {
            for (const item of batch) {
                const result = { fileId: item.fileId, saved: false, error: errorResult(error) };
                results.push(result); onResult?.(result);
            }
        }
    }
    return results;
}
