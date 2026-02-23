/**
 * 路径验证器模块
 * 提供共享的文件夹路径验证功能，供 AdminDashBoard 和 UploadHome 共同使用
 */

/**
 * 验证文件夹路径的合法性
 * @param {string} path - 要验证的路径
 * @param {{ strict?: boolean }} options - 选项，strict 为 true 时检查末尾单独的 "."（默认 true）
 * @returns {{ valid: boolean, error?: string }} 验证结果
 */
export function validateFolderPath(path, { strict = true } = {}) {
    // 如果路径为空或仅为空白字符，返回有效（表示根目录）
    if (!path || path.trim() === '') {
        return { valid: true };
    }
    
    // 如果路径仅为 "/"，返回有效（表示根目录）
    if (path === '/') {
        return { valid: true };
    }
    
    // 检查路径是否以 "/" 开头
    if (!path.startsWith('/')) {
        return { 
            valid: false, 
            error: '目标目录必须以 "/" 开头' 
        };
    }

    // 检查路径穿越：包含 .. 的路径段
    if (/(?:^|\/)\.\.(\/|$)/.test(path) || path.includes('..')) {
        return {
            valid: false,
            error: '目标目录不能包含路径穿越字符 ".."'
        };
    }

    // 检查路径中单独的 . 段
    // strict 模式检查 /./ 和末尾 /.，非 strict 模式仅检查 /./ 以允许用户继续输入如 /.123
    const dotPattern = strict ? /\/\.(\/|$)/ : /\/\.\//;
    if (dotPattern.test(path)) {
        return {
            valid: false,
            error: '目标目录不能包含单独的 "." 路径段'
        };
    }

    // 检查路径是否包含连续的斜杠
    if (path.includes('//')) {
        return { 
            valid: false, 
            error: '目标目录不能包含连续的斜杠' 
        };
    }
    
    // 检查路径是否包含非法字符
    // 非法字符包括: \ : * ? " ' < > | 空格 ( ) [ ] { } # % ^ ` ~ ; @ & = + $ ,
    const invalidChars = /[\\:\*\?"'<>\| \(\)\[\]\{\}#%\^`~;@&=\+\$,]/;
    if (invalidChars.test(path)) {
        return { 
            valid: false, 
            error: '目标目录包含非法字符，请使用合法的路径格式' 
        };
    }
    
    return { valid: true };
}
