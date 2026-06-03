/**
 * WebPlatform 文件名处理工具
 * @param keys 
 * @returns 
 */
export function extractFolderPrefix(keys: string[]): string | null {
    if (keys.length === 0) return null
    const parts = keys.map((k) => k.replace(/\\/g, '/').split('/'))
    if (parts[0].length <= 1) return null
    const dir = parts[0][0]
    if (parts.every((p) => p.length > 1 && p[0] === dir)) {
        return dir
    }
    return null
}

/**
 * 从完整路径中获取最后一级的文件名（增强版）
 * @param filePath 完整的文件路径
 * @param includeExtension 是否包含文件扩展名，默认为 true
 * @returns 最后一级的文件名
 * 
 * @example
 * getFileName('C:\\folder\\file.txt') // 'file.txt'
 * getFileName('/home/user/file.txt') // 'file.txt'
 * getFileName('C:\\folder\\file.txt', false) // 'file'
 * getFileName('https://example.com/file.pdf') // 'file.pdf'
 */
export function getFileNameFromPath(filePath: string, includeExtension: boolean = true): string {
    // 空值检查
    if (!filePath || typeof filePath !== 'string') {
        return '';
    }

    // 清理末尾的分隔符
    let cleanPath = filePath.trim();
    if (cleanPath.endsWith('/') || cleanPath.endsWith('\\')) {
        cleanPath = cleanPath.slice(0, -1);
    }

    // 获取最后一级
    const separator = /[\\/]/;
    const parts = cleanPath.split(separator);
    let fileName = parts[parts.length - 1] || '';

    // 是否需要移除扩展名
    if (!includeExtension && fileName.includes('.')) {
        const lastDotIndex = fileName.lastIndexOf('.');
        // 处理隐藏文件（如 .gitignore）
        if (lastDotIndex > 0) {
            fileName = fileName.substring(0, lastDotIndex);
        }
    }

    return fileName;
}