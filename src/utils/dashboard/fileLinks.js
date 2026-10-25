// File management shares one content/format pipeline for details and all copy actions.
export const LINK_FORMATS = ['originUrl', 'mdUrl', 'htmlUrl', 'bbUrl'];

export const LINK_CONTENT_GROUPS = [
    { key: 'telegram', label: 'Telegram', contents: ['originUrl', 'tgId'] },
    { key: 's3', label: 'S3', contents: ['originUrl', 's3Location', 's3CdnFileUrl'] },
    { key: 'webdav', label: 'WebDAV', contents: ['originUrl', 'webdavPublicUrl'] }
];

export const LINK_CONTENT_LABELS = {
    originUrl: 'settings.siteLink',
    tgId: 'settings.tgFileId',
    s3Location: 'settings.s3Link',
    s3CdnFileUrl: 'settings.s3CdnLink',
    webdavPublicUrl: 'settings.webdavPublicLink'
};

const CONTENT_FIELDS = {
    tgId: 'TgFileId',
    s3Location: 'S3Location',
    s3CdnFileUrl: 'S3CdnFileUrl',
    webdavPublicUrl: 'WebDAVPublicUrl'
};

export function getLinkContentGroup(metadata) {
    switch (metadata?.Channel) {
        case 'Telegram':
        case 'TelegramNew': return 'telegram';
        case 'S3': return 's3';
        case 'WebDAV': return 'webdav';
        default: return null;
    }
}

export function normalizeLinkPreferences(format, contents) {
    const preferences = {};
    for (const group of LINK_CONTENT_GROUPS) {
        const value = contents?.[group.key];
        preferences[group.key] = group.contents.includes(value) ? value : 'originUrl';
    }
    return {
        format: LINK_FORMATS.includes(format) ? format : 'originUrl',
        contents: preferences
    };
}

export function loadLinkPreferences(storage) {
    let format;
    let contents;
    try { format = storage.getItem('defaultUrlFormat'); } catch { /* Use defaults. */ }
    try { contents = JSON.parse(storage.getItem('defaultUrlContents')); } catch { /* Recover corrupt preferences. */ }
    return normalizeLinkPreferences(format, contents);
}

export function getAvailableLinkContents(file) {
    const groupKey = getLinkContentGroup(file?.metadata);
    const group = LINK_CONTENT_GROUPS.find(item => item.key === groupKey);
    return (group?.contents || ['originUrl']).filter(content =>
        content === 'originUrl' || Boolean(file?.metadata?.[CONTENT_FIELDS[content]])
    );
}

export function getPreferredLinkContent(file, preferences) {
    const preferred = preferences?.[getLinkContentGroup(file?.metadata)];
    return getAvailableLinkContents(file).includes(preferred) ? preferred : 'originUrl';
}

export function buildManagementFileLinks(file, rootUrl, content = 'originUrl') {
    if (!file?.name) return { content: 'originUrl', urls: {} };
    const metadata = file.metadata || {};
    const selected = getAvailableLinkContents(file).includes(content) ? content : 'originUrl';
    const url = selected === 'originUrl'
        ? (metadata.Channel === 'External' ? metadata.ExternalLink || '' : `${rootUrl}${file.name}`)
        : metadata[CONTENT_FIELDS[selected]];
    if (selected === 'tgId') return { content: selected, urls: { tgId: url } };
    const name = metadata.FileName || file.name;
    return {
        content: selected,
        urls: {
            originUrl: url,
            mdUrl: `![${name}](${url})`,
            htmlUrl: `<img src="${url}" alt="${name}" width=100%>`,
            bbUrl: `[img]${url}[/img]`
        }
    };
}

export function getManagementCopyLink(file, rootUrl, format, preferences) {
    const content = getPreferredLinkContent(file, preferences);
    const { urls } = buildManagementFileLinks(file, rootUrl, content);
    return urls.tgId || urls[format] || urls.originUrl || '';
}
