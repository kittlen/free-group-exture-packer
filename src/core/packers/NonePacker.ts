import type { SpriteRect } from '@/app/types'

/** None 打包器的方法常量 */
export const NonePackerMethod = {
  ShortSideFit: 'ShortSideFit',
  LongSideFit: 'LongSideFit',
} as const

/** None 打包器方法类型 */
export type NonePackerMethodType = (typeof NonePackerMethod)[keyof typeof NonePackerMethod]

/**
 * NonePacker：简单行列排列算法
 * 不进行空间优化，按输入顺序将图片排列在 sheet 中
 * - ShortSideFit: 横向排列（从左到右，换行）
 * - LongSideFit: 纵向排列（从上到下，换列）
 */
export class NonePacker {
  static type = 'None'
  static methods = NonePackerMethod

  /**
   * 执行打包
   * @param rects - 待排列的 Sprite 列表
   * @param method - 排列方法
   * @param sheetWidth - 单张图集最大宽度
   * @param sheetHeight - 单张图集最大高度
   * @returns 排列后的 Sheet 列表
   */
  static pack(
    rects: SpriteRect[],
    method: NonePackerMethodType,
    sheetWidth: number,
    sheetHeight: number,
    _allowRotate = false,
  ): SpriteRect[][] {
    if (!rects.length) return []

    if (method === 'LongSideFit') {
      return this.packVertical(rects, sheetWidth, sheetHeight)
    }
    return this.packHorizontal(rects, sheetWidth, sheetHeight)
  }

  /** 水平排列：从左到右排列，超宽换行 */
  private static packHorizontal(rects: SpriteRect[], sheetWidth: number, sheetHeight: number): SpriteRect[][] {
    const sheets: SpriteRect[][] = []
    let currentX = 0
    let currentY = 0
    let rowHeight = 0
    let currentSheet: SpriteRect[] = []

    for (const rect of rects) {
      const w = rect.frame.w
      const h = rect.frame.h

      if (currentX + w > sheetWidth) {
        currentX = 0
        currentY += rowHeight
        rowHeight = 0
      }

      if (currentY + h > sheetHeight) {
        sheets.push(currentSheet)
        currentSheet = []
        currentX = 0
        currentY = 0
        rowHeight = 0
      }

      rect.frame.x = currentX
      rect.frame.y = currentY
      currentX += w
      if (h > rowHeight) rowHeight = h
      currentSheet.push(rect)
    }

    if (currentSheet.length) sheets.push(currentSheet)
    return sheets
  }

  /** 竖排列：从上到下排列，超高换列 */
  private static packVertical(rects: SpriteRect[], sheetWidth: number, sheetHeight: number): SpriteRect[][] {
    const sheets: SpriteRect[][] = []
    let currentX = 0
    let currentY = 0
    let colWidth = 0
    let currentSheet: SpriteRect[] = []

    for (const rect of rects) {
      const w = rect.frame.w
      const h = rect.frame.h

      if (currentY + h > sheetHeight) {
        currentY = 0
        currentX += colWidth
        colWidth = 0
      }

      if (currentX + w > sheetWidth) {
        sheets.push(currentSheet)
        currentSheet = []
        currentX = 0
        currentY = 0
        colWidth = 0
      }

      rect.frame.x = currentX
      rect.frame.y = currentY
      currentY += h
      if (w > colWidth) colWidth = w
      currentSheet.push(rect)
    }

    if (currentSheet.length) sheets.push(currentSheet)
    return sheets
  }
}
