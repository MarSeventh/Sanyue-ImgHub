/**
 * 文件有效期工具函数
 * 选项格式与后端一致：正整数 + h（小时）或 d（天），最长 3650 天，另有 forever 表示永久
 * 最终是否生效由后端决定，这里只负责展示和提前校验
 */

export const EXPIRE_FOREVER = 'forever'
export const MAX_EXPIRE_OPTIONS = 20

// 后端到期后至少等这么久才删除文件（与后端 CLEANUP_GRACE_MS 一致），期间访问已返回 404
export const CLEANUP_GRACE_MINUTES = 5

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const MAX_EXPIRE_MS = 3650 * DAY_MS

/**
 * 后端是否支持文件有效期
 * 支持的后端在 /api/userConfig 中始终返回 fileExpiry 对象（功能关闭时为 { enabled: false }），
 * 旧后端没有该字段。serverRuntime 只表示部署平台，不能用来判断
 */
export function isFileExpirySupported(userConfig) {
    const fileExpiry = userConfig?.fileExpiry
    return typeof fileExpiry === 'object' && fileExpiry !== null
}

/**
 * 上传时可用的有效期配置；功能关闭或后端不支持时返回 undefined
 */
export function getUploadFileExpiry(userConfig) {
    const fileExpiry = userConfig?.fileExpiry
    return fileExpiry?.enabled === true ? fileExpiry : undefined
}

/**
 * 解析有效期选项
 * @param {string} option
 * @returns {number|null} 毫秒数；永久返回 0；不合法返回 null
 */
export function parseExpireOption(option) {
    if (option === EXPIRE_FOREVER) return 0
    const match = typeof option === 'string' ? /^([1-9]\d{0,5})([hd])$/.exec(option) : null
    if (!match) return null
    const duration = Number(match[1]) * (match[2] === 'h' ? HOUR_MS : DAY_MS)
    return duration <= MAX_EXPIRE_MS ? duration : null
}

export function isValidExpireOption(option) {
    return parseExpireOption(option) !== null
}

/**
 * 去重并按时长排序，永久放在最后
 */
export function sortExpireOptions(options = []) {
    const unique = [...new Set(options)].filter(isValidExpireOption)
    return unique.sort((a, b) => (parseExpireOption(a) || Infinity) - (parseExpireOption(b) || Infinity))
}

/**
 * 选项的展示文字，如“12 小时”“7 天”“永久”
 * @param {string} option
 * @param {Function} t - i18n 翻译函数
 */
export function formatExpireOption(option, t) {
    if (option === EXPIRE_FOREVER) return t('fileExpiry.forever')
    const match = /^(\d+)([hd])$/.exec(option || '')
    if (!match) return option
    return t(match[2] === 'h' ? 'fileExpiry.hours' : 'fileExpiry.days', { n: Number(match[1]) })
}

/**
 * 上传时要发送的 expire 参数
 * 功能关闭或不允许自选时不发送（后端使用默认值）；保存的选择已不在可选项中时退回默认值
 * @param {Object|undefined} fileExpiry - userConfig.fileExpiry
 * @param {string} stored - 用户上次的选择
 * @returns {string} 为空表示不发送
 */
export function resolveUploadExpire(fileExpiry, stored) {
    if (!fileExpiry || !fileExpiry.allowCustom) return ''
    const options = fileExpiry.options || []
    return options.includes(stored) ? stored : (fileExpiry.defaultExpire || '')
}

/**
 * 当前上传实际生效的有效期选项（用于提示文字）
 */
export function effectiveUploadExpire(fileExpiry, selected) {
    if (!fileExpiry) return EXPIRE_FOREVER
    return (fileExpiry.allowCustom && selected) ? selected : (fileExpiry.defaultExpire || EXPIRE_FOREVER)
}

/**
 * 拼接到上传 URL 的查询参数片段
 * @param {string} expire
 * @param {string} separator - '&' 或 '?'
 */
export function expireQuery(expire, separator = '&') {
    return expire ? `${separator}expire=${encodeURIComponent(expire)}` : ''
}

/**
 * 元数据中的到期时间（毫秒），没有时返回 null
 */
export function getExpiresAt(metadata) {
    const value = metadata?.ExpiresAt
    const expiresAt = Number(value)
    return value !== undefined && value !== null && Number.isFinite(expiresAt) ? expiresAt : null
}

export function isExpired(expiresAt, now = Date.now()) {
    return expiresAt !== null && expiresAt !== undefined && expiresAt <= now
}

/**
 * 到期时间的本地化显示
 */
export function formatExpiresAt(expiresAt, locale) {
    if (expiresAt === null || expiresAt === undefined) return ''
    return new Date(expiresAt).toLocaleString(locale, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
}

/**
 * 清理接口返回结果的提示：部分失败或仍有待清理时不能只显示“已清理 N 个”
 * @param {{deleted?: number, failed?: number, hasMore?: boolean}|undefined} cleanup
 * @param {Function} t - i18n 翻译函数
 * @returns {{type: 'success'|'warning', message: string}}
 */
export function describeCleanupResult(cleanup, t) {
    const deleted = cleanup?.deleted || 0
    const failed = cleanup?.failed || 0
    const parts = [t('fileExpiry.cleaned', { count: deleted })]
    if (failed > 0) parts.push(t('fileExpiry.cleanedFailed', { count: failed }))
    if (cleanup?.hasMore) parts.push(t('fileExpiry.cleanedMore'))
    return { type: failed > 0 || cleanup?.hasMore ? 'warning' : 'success', message: parts.join(t('fileExpiry.separator')) }
}

/**
 * 当前部署平台的清理方式说明（对应语言包中的键），平台未知时列出全部
 * @param {string|undefined} serverRuntime - userConfig.serverRuntime：'pages' / 'worker' / 'node'
 */
export function cleanupMethodKeys(serverRuntime) {
    const keys = { worker: 'fileExpiry.cleanupWorker', node: 'fileExpiry.cleanupNode', pages: 'fileExpiry.cleanupPages' }
    return keys[serverRuntime] ? [keys[serverRuntime]] : Object.values(keys)
}
