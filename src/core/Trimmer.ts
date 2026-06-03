import type { SpriteRect } from '@/app/types'

/**
 * 图片透明像素裁剪器
 * 扫描每个图片四边的透明像素，更新 spriteSourceSize 和 frame
 */
export class Trimmer {
  /**
   * 对所有 Sprite 执行透明裁剪
   * 算法：从四个方向逐行扫描，找到第一个非透明像素的位置
   * @param rects - Sprite 列表（会被直接修改）
   * @param alphaThreshold - Alpha 通道阈值（0-255），低于此值的像素视为透明
   * @param mode - 裁剪模式：
   *   - 'trim': 缩小 frame 尺寸到裁剪后大小
   *   - 'crop': 保留 frame 原尺寸，仅记录裁剪偏移
   */
  static trim(rects: SpriteRect[], alphaThreshold: number, mode: 'trim' | 'crop' = 'trim'): void {
    for (const rect of rects) {
      const img = rect.image
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img.img!, 0, 0)

      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const data = imageData.data

      let top = 0
      let bottom = img.height
      let left = 0
      let right = img.width

      // 从上往下扫描：找到第一个不透明行
      for (let y = 0; y < img.height; y++) {
        let found = false
        for (let x = 0; x < img.width; x++) {
          if (data[(y * img.width + x) * 4 + 3] > alphaThreshold) {
            found = true
            break
          }
        }
        if (found) { top = y; break }
      }

      // 从下往上扫描：找到最后一个不透明行
      for (let y = img.height - 1; y >= 0; y--) {
        let found = false
        for (let x = 0; x < img.width; x++) {
          if (data[(y * img.width + x) * 4 + 3] > alphaThreshold) {
            found = true
            break
          }
        }
        if (found) { bottom = y + 1; break }
      }

      // 从左往右扫描：找到第一个不透明列
      for (let x = 0; x < img.width; x++) {
        let found = false
        for (let y = 0; y < img.height; y++) {
          if (data[(y * img.width + x) * 4 + 3] > alphaThreshold) {
            found = true
            break
          }
        }
        if (found) { left = x; break }
      }

      // 从右往左扫描：找到最后一个不透明列
      for (let x = img.width - 1; x >= 0; x--) {
        let found = false
        for (let y = 0; y < img.height; y++) {
          if (data[(y * img.width + x) * 4 + 3] > alphaThreshold) {
            found = true
            break
          }
        }
        if (found) { right = x + 1; break }
      }

      // 更新裁剪后的源尺寸和偏移
      rect.spriteSourceSize.x = left
      rect.spriteSourceSize.y = top
      rect.spriteSourceSize.w = right - left
      rect.spriteSourceSize.h = bottom - top
      rect.trimmed = true

      if (mode === 'trim') {
        rect.frame.w = right - left
        rect.frame.h = bottom - top
      } else {
        rect.frame.w = img.width
        rect.frame.h = img.height
      }
    }
  }
}
