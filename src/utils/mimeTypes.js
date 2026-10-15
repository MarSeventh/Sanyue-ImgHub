/**
 * Frontend MIME rules, aligned with CloudFlare-ImgBed/functions/utils/mimeTypes.js.
 * Classification does not imply browser decoding, compression or AI support.
 */
export const IMAGE_TYPES_BY_EXTENSION = new Map([
    ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['jpe', 'image/jpeg'], ['jfif', 'image/jpeg'],
    ['png', 'image/png'], ['webp', 'image/webp'], ['avif', 'image/avif'], ['gif', 'image/gif'],
    ['svg', 'image/svg+xml'], ['svgz', 'image/svg+xml'], ['bmp', 'image/bmp'], ['ico', 'image/x-icon'],
    ['tif', 'image/tiff'], ['tiff', 'image/tiff'], ['heic', 'image/heic'], ['heif', 'image/heif'],
    // APNG is also handled by the frontend animation detector.
    ['apng', 'image/apng'],
]);

export const FILE_TYPES_BY_EXTENSION = new Map([
    ...IMAGE_TYPES_BY_EXTENSION,
    ['mp4', 'video/mp4'], ['m4v', 'video/mp4'], ['webm', 'video/webm'],
    ['mov', 'video/quicktime'], ['avi', 'video/x-msvideo'], ['mkv', 'video/x-matroska'],
    ['mp3', 'audio/mpeg'], ['m4a', 'audio/mp4'], ['ogg', 'audio/ogg'], ['oga', 'audio/ogg'],
    ['wav', 'audio/wav'], ['flac', 'audio/flac'], ['aac', 'audio/aac'], ['opus', 'audio/ogg'],
    ['pdf', 'application/pdf'], ['doc', 'application/msword'],
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['xls', 'application/vnd.ms-excel'],
    ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['ppt', 'application/vnd.ms-powerpoint'],
    ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['txt', 'text/plain'], ['md', 'text/markdown'], ['json', 'application/json'],
    ['xml', 'application/xml'], ['html', 'text/html'], ['css', 'text/css'], ['js', 'text/javascript'],
    ['zip', 'application/zip'], ['rar', 'application/vnd.rar'], ['7z', 'application/x-7z-compressed'],
    ['tar', 'application/x-tar'], ['gz', 'application/gzip'], ['bz2', 'application/x-bzip2'], ['xz', 'application/x-xz'],
]);

export const GENERIC_FILE_TYPES = new Set([
    '', 'application/octet-stream', 'binary/octet-stream', 'application/x-www-form-urlencoded',
]);

// Preserve the old preview categories without inventing MIME for ambiguous suffixes
// such as .ts/.raw. These hints must never enable image conversion or compression.
const LEGACY_MEDIA_CATEGORIES = new Map([
    ...['pjpeg', 'pjp', 'raw', 'cr2', 'nef', 'dng', 'eps', 'ai', 'emf', 'wmf', 'psd',
        'orf', 'sr2', 'arw', 'rw2', 'raf', 'pef', 'x3f', 'srf', 'erf', 'mrw', 'nrw',
        'kdc', 'dcr', 'mef', 'mos', 'crw', 'rwl', 'srw', '3fr', 'fff', 'iiq', 'qtk',
        'bay', 'k25', 'dcs', 'drf', 'mdc', 'ptx', 'pxn', 'r3d', 'rwz'].map(ext => [ext, 'image']),
    ...['flv', 'wmv', 'rmvb', '3gp', 'mpg', 'mpeg', 'f4v', 'rm', 'asf', 'dat', 'ts',
        'vob', 'swf', 'divx', 'xvid', 'm2ts', 'mts', 'm2v', '3g2', '3gp2', '3gpp',
        '3gpp2', 'mpe', 'm1v', 'mpv', 'mpv2', 'mp2v', 'm2t'].map(ext => [ext, 'video']),
    ...['wma', 'ape', 'aiff', 'alac', 'mid', 'midi', 'm4b', 'm4p', 'm4r', 'amr',
        'au', 'ra', 'ram'].map(ext => [ext, 'audio']),
]);

export function normalizeMimeType(fileType) {
    return String(fileType || '').split(';', 1)[0].trim().toLowerCase();
}

export function normalizeFileType(fileType) {
    const value = String(fileType || '').trim();
    const type = normalizeMimeType(value);
    if (!type) return '';
    const separator = value.indexOf(';');
    return type + (separator === -1 ? '' : value.slice(separator));
}

export function getFileExtension(fileName) {
    if (typeof fileName !== 'string') return '';
    const match = /\.([^.\/\\]+)$/.exec(fileName.trim());
    return match ? match[1].toLowerCase() : '';
}

export function inferFileType(fileName) {
    return FILE_TYPES_BY_EXTENSION.get(getFileExtension(fileName)) || '';
}

export function resolveFileType(fileName, clientType = '') {
    const type = normalizeFileType(clientType);
    if (type && !GENERIC_FILE_TYPES.has(normalizeMimeType(type))) return type;
    return inferFileType(fileName) || type || 'application/octet-stream';
}

/** Strict MIME category; parameters and substrings in application/* do not count. */
export function getFileTypeCategory(fileType) {
    const type = normalizeMimeType(fileType);
    for (const category of ['image', 'video', 'audio']) {
        if (type.startsWith(`${category}/`)) return category;
    }
    return 'other';
}

/** Accept a filename, browser File or a frontend file record without mutating it. */
export function getFileMimeType(file) {
    if (typeof file === 'string') return resolveFileType(file);
    if (!file) return 'application/octet-stream';
    // Old upload history stores an extension (e.g. "png") in type, not a MIME.
    const clientType = file.metadata?.FileType || (String(file.type || '').includes('/') ? file.type : '');
    const name = file.name || file.id || '';
    const inferenceName = inferFileType(name) ? name : (file.metadata?.FileName || name);
    return resolveFileType(inferenceName, clientType);
}

export function getFileCategory(file) {
    const type = getFileMimeType(file);
    if (!GENERIC_FILE_TYPES.has(normalizeMimeType(type))) return getFileTypeCategory(type);
    const names = typeof file === 'string' ? [file] : [file?.name, file?.id, file?.metadata?.FileName];
    for (const name of names) {
        const category = LEGACY_MEDIA_CATEGORIES.get(getFileExtension(name));
        if (category) return category;
    }
    return 'other';
}

export const isImageFile = file => getFileCategory(file) === 'image';
export const isVideoFile = file => getFileCategory(file) === 'video';
export const isAudioFile = file => getFileCategory(file) === 'audio';

/** Complete missing/generic upload MIME before animation inspection and conversion. */
export function ensureFileType(file) {
    if (!GENERIC_FILE_TYPES.has(normalizeMimeType(file.type))) return file;
    const type = resolveFileType(file.name, file.type);
    if (type === file.type) return file;
    const completed = new File([file], file.name, { type, lastModified: file.lastModified });
    for (const key of ['uid', 'uploadRelativePath', 'uploadFolder', 'relativePath', 'webkitRelativePath']) {
        if (file[key] !== undefined) {
            Object.defineProperty(completed, key, { value: file[key], writable: true, configurable: true, enumerable: true });
        }
    }
    return completed;
}
