export const FORMAT_GROUPS = {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico', 'tif', 'tiff', 'heic', 'heif'],
    videos: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'wmv', 'flv', 'mpeg', 'mpg'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus', 'wma', 'aiff'],
    documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'rtf', 'odt', 'ods', 'odp'],
    archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
};

export const MAX_UPLOAD_EXTENSIONS = 200;

export function normalizeExtensions(values) {
    return [...new Set(values.map(value => String(value).trim().toLowerCase().replace(/^\./, '')))];
}

export function isValidExtension(value) {
    return typeof value === 'string' && value.length <= 32 &&
        /^[a-z0-9][a-z0-9+_-]*(?:\.[a-z0-9][a-z0-9+_-]*)*$/.test(value);
}

export function isUploadFormatError(error) {
    return error?.response?.data?.code === 'UPLOAD_FORMAT_NOT_ALLOWED';
}
