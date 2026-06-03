import { Rect } from '../Rect'
import type { SpriteRect } from '@/app/types'

/** MaxRects 算法的排列策略常量 */
export const MaxRectsMethod = {
  BestShortSideFit: 'BestShortSideFit',
  BestLongSideFit: 'BestLongSideFit',
  BestAreaFit: 'BestAreaFit',
  BottomLeftRule: 'BottomLeftRule',
  ContactPointRule: 'ContactPointRule',
} as const

/** MaxRects 方法类型 */
export type MaxRectsMethodType = (typeof MaxRectsMethod)[keyof typeof MaxRectsMethod]

/**
 * MaxRectsBin：纯 MaxRects 算法实现
 * 基于 MaxRectsBinPack 算法的纯 TypeScript 移植
 * 支持 5 种排列策略
 */
export class MaxRectsBin {
  static type = 'MaxRectsBin'
  static methods = MaxRectsMethod

  /** 已使用的矩形列表 */
  private usedRectangles: Rect[] = []
  /** 空闲矩形列表 */
  private freeRectangles: Rect[] = []
  private binWidth: number
  private binHeight: number
  private allowRotate: boolean

  constructor(width: number, height: number, allowRotate = false) {
    this.binWidth = width
    this.binHeight = height
    this.allowRotate = allowRotate
    this.freeRectangles.push(new Rect(0, 0, width, height))
  }

  /**
   * 执行打包
   * @param rectangles - 待排列的 Sprite 列表
   * @param method - 排列策略
   * @returns 成功排列的 Sprite 列表
   */
  pack(rectangles: SpriteRect[], method: MaxRectsMethodType): SpriteRect[] {
    return this.insert2(rectangles, method)
  }

  /** 主循环：对每个矩形选择最佳位置插入 */
  private insert2(rectangles: SpriteRect[], method: MaxRectsMethodType): SpriteRect[] {
    const res: SpriteRect[] = []

    while (rectangles.length > 0) {
      let bestScore1 = Infinity
      let bestScore2 = Infinity
      let bestRectangleIndex = -1
      const bestNode = new Rect()

      for (let i = 0; i < rectangles.length; i++) {
        const score1 = { value: 0 }
        const score2 = { value: 0 }
        const newNode = this.scoreRectangle(
          rectangles[i].frame.w,
          rectangles[i].frame.h,
          method,
          score1,
          score2,
        )

        if (score1.value < bestScore1 || (score1.value === bestScore1 && score2.value < bestScore2)) {
          bestScore1 = score1.value
          bestScore2 = score2.value
          bestNode.x = newNode.x
          bestNode.y = newNode.y
          bestNode.width = newNode.width
          bestNode.height = newNode.height
          bestRectangleIndex = i
        }
      }

      if (bestRectangleIndex === -1) return res

      this.placeRectangle(bestNode)
      const rect = rectangles.splice(bestRectangleIndex, 1)[0]
      rect.frame.x = bestNode.x
      rect.frame.y = bestNode.y
      if (rect.frame.w !== bestNode.width || rect.frame.h !== bestNode.height) {
        rect.rotated = true
      }
      res.push(rect)
    }

    return res
  }

  private scoreRectangle(
    width: number,
    height: number,
    method: MaxRectsMethodType,
    score1: { value: number },
    score2: { value: number },
  ): Rect {
    const newNode = new Rect()
    score1.value = Infinity
    score2.value = Infinity

    switch (method) {
      case MaxRectsMethod.BestShortSideFit:
        return this.findPositionBestShortSideFit(width, height, score1, score2)
      case MaxRectsMethod.BottomLeftRule:
        return this.findPositionBottomLeft(width, height, score1, score2)
      case MaxRectsMethod.ContactPointRule: {
        const n = this.findPositionContactPoint(width, height, score1)
        if (n.height === 0) {
          score1.value = Infinity
        } else {
          score1.value = -score1.value
        }
        return n
      }
      case MaxRectsMethod.BestLongSideFit:
        return this.findPositionBestLongSideFit(width, height, score2, score1)
      case MaxRectsMethod.BestAreaFit:
        return this.findPositionBestAreaFit(width, height, score1, score2)
    }
    return newNode
  }

  /** 放置矩形：分割被占用的空闲区域，清理完全包含的冗余区域 */
  private placeRectangle(node: Rect): void {
    let numRectanglesToProcess = this.freeRectangles.length
    for (let i = 0; i < numRectanglesToProcess; i++) {
      if (this.splitFreeNode(this.freeRectangles[i], node)) {
        this.freeRectangles.splice(i, 1)
        i--
        numRectanglesToProcess--
      }
    }
    this.pruneFreeList()
    this.usedRectangles.push(node)
  }

  /**
   * BestShortSideFit：选择使较短剩余边最短的位置
   * @param width - 放置矩形宽度
   * @param height - 放置矩形高度
   * @param bestShortSideFit - 输出：最佳短边匹配值
   * @param bestLongSideFit - 输出：最佳长边匹配值
   */
  private findPositionBestShortSideFit(
    width: number,
    height: number,
    bestShortSideFit: { value: number },
    bestLongSideFit: { value: number },
  ): Rect {
    const bestNode = new Rect()
    bestShortSideFit.value = Infinity

    for (const rect of this.freeRectangles) {
      if (rect.width >= width && rect.height >= height) {
        const leftoverHoriz = Math.abs(rect.width - width)
        const leftoverVert = Math.abs(rect.height - height)
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert)
        const longSideFit = Math.max(leftoverHoriz, leftoverVert)

        if (shortSideFit < bestShortSideFit.value || (shortSideFit === bestShortSideFit.value && longSideFit < bestLongSideFit.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = width
          bestNode.height = height
          bestShortSideFit.value = shortSideFit
          bestLongSideFit.value = longSideFit
        }
      }

      if (this.allowRotate && rect.width >= height && rect.height >= width) {
        const leftoverHoriz = Math.abs(rect.width - height)
        const leftoverVert = Math.abs(rect.height - width)
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert)
        const longSideFit = Math.max(leftoverHoriz, leftoverVert)

        if (shortSideFit < bestShortSideFit.value || (shortSideFit === bestShortSideFit.value && longSideFit < bestLongSideFit.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = height
          bestNode.height = width
          bestShortSideFit.value = shortSideFit
          bestLongSideFit.value = longSideFit
        }
      }
    }

    return bestNode
  }

  /**
   * BestLongSideFit：选择使较长剩余边最短的位置
   */
  private findPositionBestLongSideFit(
    width: number,
    height: number,
    bestShortSideFit: { value: number },
    bestLongSideFit: { value: number },
  ): Rect {
    const bestNode = new Rect()
    bestLongSideFit.value = Infinity

    for (const rect of this.freeRectangles) {
      if (rect.width >= width && rect.height >= height) {
        const leftoverHoriz = Math.abs(rect.width - width)
        const leftoverVert = Math.abs(rect.height - height)
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert)
        const longSideFit = Math.max(leftoverHoriz, leftoverVert)

        if (longSideFit < bestLongSideFit.value || (longSideFit === bestLongSideFit.value && shortSideFit < bestShortSideFit.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = width
          bestNode.height = height
          bestShortSideFit.value = shortSideFit
          bestLongSideFit.value = longSideFit
        }
      }

      if (this.allowRotate && rect.width >= height && rect.height >= width) {
        const leftoverHoriz = Math.abs(rect.width - height)
        const leftoverVert = Math.abs(rect.height - width)
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert)
        const longSideFit = Math.max(leftoverHoriz, leftoverVert)

        if (longSideFit < bestLongSideFit.value || (longSideFit === bestLongSideFit.value && shortSideFit < bestShortSideFit.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = height
          bestNode.height = width
          bestShortSideFit.value = shortSideFit
          bestLongSideFit.value = longSideFit
        }
      }
    }

    return bestNode
  }

  /**
   * BestAreaFit：选择使剩余面积（freeArea - rectArea）最小的位置
   */
  private findPositionBestAreaFit(
    width: number,
    height: number,
    bestAreaFit: { value: number },
    bestShortSideFit: { value: number },
  ): Rect {
    const bestNode = new Rect()
    bestAreaFit.value = Infinity

    for (const rect of this.freeRectangles) {
      const areaFit = rect.width * rect.height - width * height

      if (rect.width >= width && rect.height >= height) {
        const leftoverHoriz = Math.abs(rect.width - width)
        const leftoverVert = Math.abs(rect.height - height)
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert)

        if (areaFit < bestAreaFit.value || (areaFit === bestAreaFit.value && shortSideFit < bestShortSideFit.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = width
          bestNode.height = height
          bestShortSideFit.value = shortSideFit
          bestAreaFit.value = areaFit
        }
      }

      if (this.allowRotate && rect.width >= height && rect.height >= width) {
        const leftoverHoriz = Math.abs(rect.width - height)
        const leftoverVert = Math.abs(rect.height - width)
        const shortSideFit = Math.min(leftoverHoriz, leftoverVert)

        if (areaFit < bestAreaFit.value || (areaFit === bestAreaFit.value && shortSideFit < bestShortSideFit.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = height
          bestNode.height = width
          bestShortSideFit.value = shortSideFit
          bestAreaFit.value = areaFit
        }
      }
    }

    return bestNode
  }

  /**
   * BottomLeftRule：选择 Y 坐标最小（靠下）的位置，Y 相同时选 X 最小
   */
  private findPositionBottomLeft(
    width: number,
    height: number,
    bestY: { value: number },
    bestX: { value: number },
  ): Rect {
    const bestNode = new Rect()
    bestY.value = Infinity

    for (const rect of this.freeRectangles) {
      if (rect.width >= width && rect.height >= height) {
        const topSideY = rect.y + height
        if (topSideY < bestY.value || (topSideY === bestY.value && rect.x < bestX.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = width
          bestNode.height = height
          bestY.value = topSideY
          bestX.value = rect.x
        }
      }

      if (this.allowRotate && rect.width >= height && rect.height >= width) {
        const topSideY = rect.y + width
        if (topSideY < bestY.value || (topSideY === bestY.value && rect.x < bestX.value)) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = height
          bestNode.height = width
          bestY.value = topSideY
          bestX.value = rect.x
        }
      }
    }

    return bestNode
  }

  /**
   * ContactPointRule：选择与已放置矩形接触边最长的位置
   */
  private findPositionContactPoint(
    width: number,
    height: number,
    bestContactScore: { value: number },
  ): Rect {
    const bestNode = new Rect()
    bestContactScore.value = -1

    for (const rect of this.freeRectangles) {
      if (rect.width >= width && rect.height >= height) {
        const score = this.contactPointScore(rect.x, rect.y, width, height)
        if (score > bestContactScore.value) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = width
          bestNode.height = height
          bestContactScore.value = score
        }
      }

      if (this.allowRotate && rect.width >= height && rect.height >= width) {
        const score = this.contactPointScore(rect.x, rect.y, height, width)
        if (score > bestContactScore.value) {
          bestNode.x = rect.x
          bestNode.y = rect.y
          bestNode.width = height
          bestNode.height = width
          bestContactScore.value = score
        }
      }
    }

    return bestNode
  }

  /** 计算矩形在指定位置与已放置矩形的接触边总长度 */
  private contactPointScore(x: number, y: number, width: number, height: number): number {
    let score = 0
    if (x === 0 || x + width === this.binWidth) score += height
    if (y === 0 || y + height === this.binHeight) score += width

    for (const rect of this.usedRectangles) {
      if (rect.x === x + width || rect.x + rect.width === x)
        score += this.commonIntervalLength(rect.y, rect.y + rect.height, y, y + height)
      if (rect.y === y + height || rect.y + rect.height === y)
        score += this.commonIntervalLength(rect.x, rect.x + rect.width, x, x + width)
    }

    return score
  }

  /** 计算两个区间在一条轴上的重叠长度 */
  private commonIntervalLength(i1start: number, i1end: number, i2start: number, i2end: number): number {
    if (i1end < i2start || i2end < i1start) return 0
    return Math.min(i1end, i2end) - Math.max(i1start, i2start)
  }

  /** 分割空闲矩形：在 usedNode 占据的区域上切分，产生最多 2 个新的空闲矩形 */
  private splitFreeNode(freeNode: Rect, usedNode: Rect): boolean {
    if (
      usedNode.x >= freeNode.x + freeNode.width ||
      usedNode.x + usedNode.width <= freeNode.x ||
      usedNode.y >= freeNode.y + freeNode.height ||
      usedNode.y + usedNode.height <= freeNode.y
    ) {
      return false
    }

    if (usedNode.x < freeNode.x + freeNode.width && usedNode.x + usedNode.width > freeNode.x) {
      if (usedNode.y > freeNode.y && usedNode.y < freeNode.y + freeNode.height) {
        const newNode = freeNode.clone()
        newNode.height = usedNode.y - newNode.y
        this.freeRectangles.push(newNode)
      }
      if (usedNode.y + usedNode.height < freeNode.y + freeNode.height) {
        const newNode = freeNode.clone()
        newNode.y = usedNode.y + usedNode.height
        newNode.height = freeNode.y + freeNode.height - (usedNode.y + usedNode.height)
        this.freeRectangles.push(newNode)
      }
    }

    if (usedNode.y < freeNode.y + freeNode.height && usedNode.y + usedNode.height > freeNode.y) {
      if (usedNode.x > freeNode.x && usedNode.x < freeNode.x + freeNode.width) {
        const newNode = freeNode.clone()
        newNode.width = usedNode.x - newNode.x
        this.freeRectangles.push(newNode)
      }
      if (usedNode.x + usedNode.width < freeNode.x + freeNode.width) {
        const newNode = freeNode.clone()
        newNode.x = usedNode.x + usedNode.width
        newNode.width = freeNode.x + freeNode.width - (usedNode.x + usedNode.width)
        this.freeRectangles.push(newNode)
      }
    }

    return true
  }

  /** 清理空闲列表中完全被其他空闲矩形包含的冗余区域 */
  private pruneFreeList(): void {
    for (let i = 0; i < this.freeRectangles.length; i++) {
      for (let j = i + 1; j < this.freeRectangles.length; j++) {
        if (Rect.hitTest(this.freeRectangles[i], this.freeRectangles[j])) {
          this.freeRectangles.splice(i, 1)
          break
        }
        if (Rect.hitTest(this.freeRectangles[j], this.freeRectangles[i])) {
          this.freeRectangles.splice(j, 1)
        }
      }
    }
  }
}
