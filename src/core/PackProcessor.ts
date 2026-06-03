import { MaxRectsBin } from './packers/MaxRectsBin'
import { MaxRectsPacker } from './packers/MaxRectsPacker'
import { OptimalPacker } from './packers/OptimalPacker'
import { NonePacker } from './packers/NonePacker'
import { Trimmer } from './Trimmer'
import { getPackerByType } from './packers'
import { smartSortImages } from '@/utils/sort'
import type { RawImage, SpriteRect, PackOptions } from '@/app/types'
import type { MaxRectsMethodType } from './packers/MaxRectsBin'
import type { NonePackerMethodType } from './packers/NonePacker'

/** 打包输出的一个 Sheet */
export interface PackSheet {
  /** 该 Sheet 中所有 Sprite 的排版信息 */
  rects: SpriteRect[]
  /** Sheet 实际宽度 */
  width: number
  /** Sheet 实际高度 */
  height: number
}

/**
 * 核心打包引擎
 * 完整流程：排序 → 裁剪 → 计算 padding → 装箱 → 结果调整
 */
export class PackProcessor {
  /**
   * 执行打包
   * @param images 输入图片映射（键为文件名）
   * @param options 打包参数
   * @param imageOrder 图片顺序（用于 None packer，其他算法自动排序）
   * @returns 打包产生的 Sheet 列表
   */
  static pack(images: Record<string, RawImage>, options: PackOptions, imageOrder?: string[]): PackSheet[] {
    const padding = options.padding || 0
    const extrude = options.extrude || 0
    const alphaThreshold = Math.min(options.alphaThreshold || 0, 255)

    // 第一步：将图片转换为 SpriteRect 列表
    let rects: SpriteRect[] = this.buildRects(images, imageOrder)

    // 计算最小需要的图集尺寸
    let totalWidth = 0
    let totalHeight = 0
    let minWidth = 0
    let minHeight = 0
    for (const r of rects) {
      totalWidth += r.frame.w
      totalHeight += r.frame.h
      if (r.frame.w > minWidth) minWidth = r.frame.w + padding * 2 + extrude * 2
      if (r.frame.h > minHeight) minHeight = r.frame.h + padding * 2 + extrude * 2
    }

    let sheetWidth = options.width || totalWidth
    let sheetHeight = options.height || totalHeight

    if (options.powerOfTwo) {
      sheetWidth = this.nextPowerOfTwo(sheetWidth)
      sheetHeight = this.nextPowerOfTwo(sheetHeight)
    }

    if (sheetWidth < minWidth || sheetHeight < minHeight) {
      throw new Error(`Sheet size too small: need at least ${minWidth}x${minHeight} pixels`)
    }

    // 第二步：透明像素裁剪
    if (options.allowTrim) {
      Trimmer.trim(rects, alphaThreshold, options.trimMode)
    }

    // 第三步：加上 padding 和 extrude 用于装箱
    for (const item of rects) {
      item.frame.w += padding * 2 + extrude * 2
      item.frame.h += padding * 2 + extrude * 2
    }

    // 第四步：检测相同图片
    let identical: SpriteRect[] = []
    if (options.detectIdentical) {
      const deduped = this.detectIdentical(rects)
      rects = deduped.rects
      identical = deduped.identical
    }

    // 第五步：执行装箱
    const packerClass = getPackerByType(options.packer) || MaxRectsBin
    let allSheets: SpriteRect[][]

    if (packerClass === NonePacker) {
      allSheets = NonePacker.pack(rects, options.packerMethod as NonePackerMethodType, sheetWidth, sheetHeight)
    } else if (packerClass === OptimalPacker) {
      const result = OptimalPacker.pack(rects, sheetWidth, sheetHeight, options.allowRotation)
      allSheets = result.sheets
    } else if (packerClass === MaxRectsPacker) {
      const packer = new MaxRectsPacker(sheetWidth, sheetHeight, options.allowRotation)
      allSheets = packer.pack(rects, options.packerMethod)
    } else {
      allSheets = []
      while (rects.length > 0) {
        const packer = new MaxRectsBin(sheetWidth, sheetHeight, options.allowRotation)
        const packed = packer.pack(rects, options.packerMethod as MaxRectsMethodType)
        if (packed.length === 0) break
        allSheets.push(packed)
      }
    }

    // 第六步：应用相同图片克隆
    if (options.detectIdentical && identical.length > 0) {
      for (const sheet of allSheets) {
        this.applyIdentical(sheet, identical)
      }
    }

    // 第七步：还原 padding/extrude 偏移，确定最终尺寸
    const result: PackSheet[] = []
    for (const sheet of allSheets) {
      for (const item of sheet) {
        item.frame.x += padding + extrude
        item.frame.y += padding + extrude
        item.frame.w -= padding * 2 + extrude * 2
        item.frame.h -= padding * 2 + extrude * 2
      }

      const actualWidth = this.getSheetWidth(sheet)
      const actualHeight = this.getSheetHeight(sheet)

      result.push({
        rects: sheet,
        width: options.fixedSize ? (options.width || actualWidth) : actualWidth,
        height: options.fixedSize ? (options.height || actualHeight) : actualHeight,
      })
    }

    return result
  }

  /** 将图片映射转为 SpriteRect 列表 */
  private static buildRects(images: Record<string, RawImage>, order?: string[]): SpriteRect[] {
    const rects: SpriteRect[] = []
    const names = order ?? Object.keys(images).sort(smartSortImages)

    for (const key of names) {
      const img = images[key]
      const name = key.split('.')[0]

      rects.push({
        frame: { x: 0, y: 0, w: img.width, h: img.height },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: img.width, h: img.height },
        sourceSize: { w: img.width, h: img.height },
        name,
        file: key,
        image: img,
      })
    }

    return rects
  }

  /**
   * 检测 base64 数据完全相同的图片
   * 将重复图片移除，记录引用关系
   * 使用 Map 实现 O(n) 时间复杂度（相比 O(n²) 的 includes 检测）
   */
  private static detectIdentical(rects: SpriteRect[]) {
    const seen = new Map<string, SpriteRect>()
    const identical: SpriteRect[] = []

    for (const rect of rects) {
      const b64 = rect.image._base64
      const existing = seen.get(b64)
      if (existing && existing !== rect) {
        rect.identical = existing
        identical.push(rect)
      } else {
        seen.set(b64, rect)
      }
    }

    const deduped = rects.filter((r) => !identical.includes(r))

    return { rects: deduped, identical }
  }

  /** 将相同图片的克隆添加到结果中 */
  private static applyIdentical(rects: SpriteRect[], identical: SpriteRect[]): void {
    const toRemove: SpriteRect[] = []
    const toAdd: SpriteRect[] = []

    for (const item of identical) {
      const srcIdx = rects.indexOf(item.identical!)
      if (srcIdx >= 0) {
        const clone: SpriteRect = { ...item.identical!, name: item.name, file: item.file, image: item.image, cloned: true, skipRender: true }
        toRemove.push(item)
        toAdd.push(clone)
      }
    }

    for (const item of toRemove) {
      const idx = identical.indexOf(item)
      if (idx >= 0) identical.splice(idx, 1)
    }

    rects.push(...toAdd)
  }

  /** 计算 Sheet 实际宽度（旋转图片使用互换后的尺寸） */
  private static getSheetWidth(rects: SpriteRect[]): number {
    return rects.reduce((max, r) => {
      const w = r.rotated ? r.frame.h : r.frame.w
      return Math.max(max, r.frame.x + w)
    }, 0)
  }

  /** 计算 Sheet 实际高度（旋转图片使用互换后的尺寸） */
  private static getSheetHeight(rects: SpriteRect[]): number {
    return rects.reduce((max, r) => {
      const h = r.rotated ? r.frame.w : r.frame.h
      return Math.max(max, r.frame.y + h)
    }, 0)
  }

  /** 计算大于等于 n 的最小 2 的幂 */
  private static nextPowerOfTwo(n: number): number {
    let p = 1
    while (p < n) p *= 2
    return p
  }
}
