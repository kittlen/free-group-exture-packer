/**
 * tinify 模块类型声明
 * TinyPNG 官方 Node.js SDK 类型定义
 */
declare module 'tinify' {
  interface TinifyInstance {
    /** 设置 API Key */
    key: string
    /** 从 Buffer 压缩图片，返回可生成 Buffer 的对象 */
    fromBuffer(buffer: Buffer): { toBuffer(): Promise<Buffer> }
  }
  const tinify: TinifyInstance
  export default tinify
}
