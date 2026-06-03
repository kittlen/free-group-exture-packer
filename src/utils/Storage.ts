/**
 * 简易 localStorage 封装
 * 自动添加前缀 't-packer-' 避免与其他应用冲突
 */
const PREFIX = 't-packer-'

export class Storage {
  /** 保存数据（对象自动 JSON 序列化） */
  static save(key: string, value: unknown): void {
    key = PREFIX + key
    const data = typeof value !== 'string' ? JSON.stringify(value) : value
    localStorage.setItem(key, data)
  }

  /**
   * 加载数据
   * @param isJson - 是否自动解析 JSON（若解析失败返回 null）
   */
  static load(key: string, isJson = true): unknown {
    key = PREFIX + key
    const value = localStorage.getItem(key)
    if (value && isJson) {
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    }
    return value
  }
}
