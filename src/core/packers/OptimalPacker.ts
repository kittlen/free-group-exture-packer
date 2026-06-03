import { MaxRectsBin } from './MaxRectsBin'
import { MaxRectsPacker } from './MaxRectsPacker'
import type { SpriteRect } from '@/app/types'
import type { MaxRectsMethodType } from './MaxRectsBin'

type PackerCombo = {
  packerClass: typeof MaxRectsBin | typeof MaxRectsPacker
  packerMethod: string
  allowRotation: boolean
}

/**
 * OptimalPacker：最优打包器
 * 尝试所有注册 packer × 所有方法 × 旋转组合，返回 Sheet 最少的结果
 */
export class OptimalPacker {
  static type = 'OptimalPacker'
  static methods = { Optimal: 'Optimal' }

  /** 获取所有可能的打包策略组合 */
  private static getAllCombinations(allowRotation: boolean): PackerCombo[] {
    const methods: PackerCombo[] = []

    for (const packerClass of [MaxRectsBin, MaxRectsPacker] as const) {
      for (const method of Object.values(packerClass.methods)) {
        methods.push({ packerClass, packerMethod: method as string, allowRotation: false })
        if (allowRotation) {
          methods.push({ packerClass, packerMethod: method as string, allowRotation: true })
        }
      }
    }

    return methods
  }

  /**
   * 执行最优打包
   */
  static pack(
    rects: SpriteRect[],
    width: number,
    height: number,
    allowRotation: boolean,
  ): { sheets: SpriteRect[][]; efficiency: number } {
    const combos = this.getAllCombinations(allowRotation)
    const sourceArea = rects.reduce((sum, r) => sum + r.sourceSize.w * r.sourceSize.h, 0)

    let optimalSheets: SpriteRect[][] | null = null
    let optimalSheetCount = Infinity
    let optimalEfficiency = 0

    for (const combo of combos) {
      const rectsCopy = rects.map((r) => ({
        ...r,
        frame: { ...r.frame },
        spriteSourceSize: { ...r.spriteSourceSize },
        sourceSize: { ...r.sourceSize },
      }))

      let sheets: SpriteRect[][]

      if (combo.packerClass === MaxRectsPacker) {
        const packer = new MaxRectsPacker(width, height, combo.allowRotation)
        sheets = packer.pack(rectsCopy, combo.packerMethod)
      } else {
        const bin = new MaxRectsBin(width, height, combo.allowRotation)
        const packed = bin.pack(rectsCopy, combo.packerMethod as MaxRectsMethodType)
        sheets = [packed]
      }

      const sheetArea = sheets.reduce((sum, s) => {
        const sw = s.reduce((m, r) => Math.max(m, r.frame.x + r.frame.w), 0)
        const sh = s.reduce((m, r) => Math.max(m, r.frame.y + r.frame.h), 0)
        return sum + sw * sh
      }, 0)

      const efficiency = sourceArea / sheetArea
      const sheetCount = sheets.length

      if (sheetCount < optimalSheetCount || (sheetCount === optimalSheetCount && efficiency > optimalEfficiency)) {
        optimalSheets = sheets
        optimalSheetCount = sheetCount
        optimalEfficiency = efficiency
      }
    }

    if (!optimalSheets) return { sheets: [], efficiency: 0 }
    return { sheets: optimalSheets, efficiency: optimalEfficiency }
  }
}
