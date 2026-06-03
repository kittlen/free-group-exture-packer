import { MaxRectsPacker as MaxRectsPackerEngine, PACKING_LOGIC, Rectangle } from 'maxrects-packer'
import type { SpriteRect } from '@/app/types'

/** MaxRectsPacker 方法常量（对应 npm 库 maxrects-packer 的配置组合） */
export const MaxRectsPackerMethod = {
  Smart: 'Smart',
  SmartArea: 'SmartArea',
  Square: 'Square',
  SquareArea: 'SquareArea',
} as const

export type MaxRectsPackerMethodType = (typeof MaxRectsPackerMethod)[keyof typeof MaxRectsPackerMethod]

/**
 * MaxRectsPacker：基于 maxrects-packer npm 库的多 Sheet 打包器
 * 方法映射与旧版 free-tex-packer 一致：
 *   Smart     → smart=true,  square=false, logic=MAX_EDGE
 *   SmartArea → smart=true,  square=false, logic=MAX_AREA
 *   Square    → smart=false, square=true,  logic=MAX_EDGE
 *   SquareArea → smart=false, square=true,  logic=MAX_AREA
 */
export class MaxRectsPacker {
  static type = 'MaxRectsPacker'
  static methods = MaxRectsPackerMethod

  private binWidth: number
  private binHeight: number
  private allowRotate: boolean

  constructor(width: number, height: number, allowRotate = false) {
    this.binWidth = width
    this.binHeight = height
    this.allowRotate = allowRotate
  }

  /** 将方法名映射到 maxrects-packer 的配置选项 */
  private getOptions(method: string) {
    const isSmart = method === MaxRectsPackerMethod.Smart || method === MaxRectsPackerMethod.SmartArea
    const isSquare = method === MaxRectsPackerMethod.Square || method === MaxRectsPackerMethod.SquareArea
    const isEdge = method === MaxRectsPackerMethod.Smart || method === MaxRectsPackerMethod.Square

    return {
      smart: isSmart,
      pot: false,
      square: isSquare,
      allowRotation: this.allowRotate,
      logic: isEdge ? PACKING_LOGIC.MAX_EDGE : PACKING_LOGIC.MAX_AREA,
    }
  }

  /**
   * 执行多 Sheet 打包
   * @param rectangles - 待排列的 Sprite 列表
   * @param method - 排列方法（Smart / SmartArea / Square / SquareArea）
   * @returns 排列后的 Sheet 列表
   */
  pack(rectangles: SpriteRect[], method: string): SpriteRect[][] {
    const options = this.getOptions(method)
    const packer = new MaxRectsPackerEngine(this.binWidth, this.binHeight, 0, options)

    const input = rectangles.map((item) => ({
      width: item.frame.w,
      height: item.frame.h,
      data: item,
    })) as unknown as Rectangle[]

    packer.addArray(input)

    const result: SpriteRect[][] = []

    for (const bin of packer.bins) {
      const sheet: SpriteRect[] = []
      for (const item of bin.rects) {
        item.data.frame.x = item.x
        item.data.frame.y = item.y
        if (item.rot) {
          item.data.rotated = true
        }
        sheet.push(item.data)
      }
      result.push(sheet)
    }

    return result
  }
}
