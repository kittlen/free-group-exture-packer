/**
 * TinyPNG 图片压缩集成
 *
 * 仅支持 Electron 模式，通过 IPC 调用后端 tinify 库进行压缩
 * Web 模式下 TinyPNG 功能不可用（无 PHP 代理后端）
 */

/** TinyPNG 压缩器 */
export class TinyPngCompressor {
  /**
   * 对图片数据进行 TinyPNG 压缩
   * @param imageData Base64 编码的图片数据（不含 data: URL 前缀）
   * @param apiKey TinyPNG API Key
   * @param options.textureFormat 图片格式 png/jpg
   * @returns 压缩后的 Base64 数据
   */
  static async compress(imageData: string, apiKey: string, _options: { textureFormat: string }): Promise<string> {
    const api = window.electronAPI
    if (!api?.tinify) {
      throw new Error('TinyPNG 压缩仅在 Electron 桌面版可用')
    }

    const result = await api.tinify({ imageData, key: apiKey })
    if (!result.success) throw new Error(result.error || 'TinyPNG 压缩失败')
    return result.data
  }
}
