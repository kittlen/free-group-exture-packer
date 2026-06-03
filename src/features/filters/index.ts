/**
 * 图片滤镜系统
 * 在导出时对纹理图集应用滤镜效果
 */

/** 滤镜基类 */
abstract class BaseFilter {
  abstract type: string
  /** 对 Canvas 图片数据应用滤镜，返回修改后的 ImageData */
  abstract apply(imageData: ImageData): ImageData
}

/** 原始滤镜（不做任何处理） */
class OriginalFilter extends BaseFilter {
  type = 'Original'
  apply(imageData: ImageData): ImageData {
    return imageData
  }
}

/** 灰度滤镜（将彩色转为灰度） */
class GrayscaleFilter extends BaseFilter {
  type = 'Grayscale'
  apply(imageData: ImageData): ImageData {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }
    return imageData
  }
}

/** 遮罩滤镜（将透明部分变白，不透明部分保留） */
class MaskFilter extends BaseFilter {
  type = 'Mask'
  apply(imageData: ImageData): ImageData {
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        // 透明像素设为白色
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
      }
    }
    return imageData
  }
}

/** 所有可用滤镜列表 */
export const filters: BaseFilter[] = [new OriginalFilter(), new MaskFilter(), new GrayscaleFilter()]

/** 根据类型名查找滤镜 */
export function getFilterByType(type: string): BaseFilter {
  return filters.find((f) => f.type === type) ?? filters[0]
}
