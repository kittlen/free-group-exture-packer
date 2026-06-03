/** 矩形工具类，用于装箱算法中的空间管理和碰撞检测 */
export class Rect {
  /** 左上角 X 坐标 */
  x: number
  /** 左上角 Y 坐标 */
  y: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  /** 克隆当前矩形 */
  clone(): Rect {
    return new Rect(this.x, this.y, this.width, this.height)
  }

  /** 判断矩形 a 是否完全被矩形 b 包含 */
  static hitTest(a: Rect, b: Rect): boolean {
    return (
      a.x >= b.x &&
      a.y >= b.y &&
      a.x + a.width <= b.x + b.width &&
      a.y + a.height <= b.y + b.height
    )
  }
}
