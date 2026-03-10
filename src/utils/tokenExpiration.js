/**
 * Token 过期时间工具模块
 * 提供 Token 有效期计算、状态判定和向后兼容默认值填充功能
 */

/**
 * 时间单位到毫秒的映射（月和年需要特殊处理）
 */
const SIMPLE_UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * 根据基准时间、数值和时间单位计算过期时间
 * @param {Date|string} baseTime - 基准时间（Date 对象或 ISO 8601 字符串）
 * @param {number} value - 正整数有效期数值
 * @param {string} unit - 时间单位：'s','m','h','d','M','Y'
 * @returns {string} 过期时间 ISO 8601 字符串
 * @throws {Error} 当 value <= 0 或 unit 无效时抛出错误
 */
export function computeExpiresAt(baseTime, value, unit) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('有效期数值必须大于 0');
  }

  const base = typeof baseTime === 'string' ? new Date(baseTime) : new Date(baseTime.getTime());

  if (SIMPLE_UNIT_MS[unit]) {
    return new Date(base.getTime() + value * SIMPLE_UNIT_MS[unit]).toISOString();
  }

  if (unit === 'M') {
    base.setUTCMonth(base.getUTCMonth() + value);
    return base.toISOString();
  }

  if (unit === 'Y') {
    base.setUTCFullYear(base.getUTCFullYear() + value);
    return base.toISOString();
  }

  throw new Error(`无效的时间单位: ${unit}`);
}


/**
 * 格式化过期时间为可读字符串
 * @param {string} isoString - ISO 8601 时间字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatExpiresTime(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取 Token 的状态信息
 * @param {string|null} expiresAt - 过期时间 ISO 8601 字符串，null 表示永不过期
 * @param {Date} [now=new Date()] - 当前时间
 * @returns {{ status: 'active'|'expired', label: '有效'|'已过期', expiresText: string }}
 */
export function getTokenStatus(expiresAt, now = new Date()) {
  if (expiresAt === null || expiresAt === undefined) {
    return {
      status: 'active',
      label: '有效',
      expiresText: '永不过期',
    };
  }

  const expiresDate = new Date(expiresAt);
  const currentTime = now instanceof Date ? now : new Date(now);
  const formattedTime = formatExpiresTime(expiresAt);

  if (currentTime.getTime() > expiresDate.getTime()) {
    return {
      status: 'expired',
      label: '已过期',
      expiresText: formattedTime,
    };
  }

  return {
    status: 'active',
    label: '有效',
    expiresText: formattedTime,
  };
}


/**
 * 为缺少过期相关字段的旧 Token 数据填充默认值
 * @param {Object} tokenData - Token 数据对象
 * @returns {Object} 填充默认值后的新 Token 数据对象
 */
export function applyTokenDefaults(tokenData) {
  return {
    ...tokenData,
    expiresAt: tokenData.expiresAt ?? null,
    autoDelete: tokenData.autoDelete ?? false,
  };
}
