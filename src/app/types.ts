/** 原始图片数据 */
export interface RawImage extends BaseRawImage {
  /** HTML Image 元素引用 */
  img?: HTMLImageElement
  /** 用于滤镜处理的 Canvas */
  canvas?: HTMLCanvasElement
  /** Canvas 2D 上下文 */
  ctx?: CanvasRenderingContext2D
  /** 是否被选中 */
  selected?: boolean
  /** 是否当前高亮项 */
  current?: boolean
  /** Electron 环境下的文件系统路径 */
  fsPath?: { path: string; folder?: string }
}

/** 原始图片数据 */
export interface BaseRawImage {
  /** 图片名称 */
  name: string
  /** 文件路径 */
  file: string
  /** 图片宽度（像素） */
  width: number
  /** 图片高度（像素） */
  height: number
  /** Base64 编码的图片数据（不含 data: URL 前缀） */
  _base64: string
}

/** 矩形区域 */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
  /** 宽的一半（用于导出模板） */
  hw?: number
  /** 高的一半（用于导出模板） */
  hh?: number
}

/** 单个 Sprite 在打包结果中的信息 */
export interface SpriteRect {
  /** 在图集中的位置和尺寸 */
  frame: Rect & { hw?: number; hh?: number }
  /** 是否被旋转 */
  rotated: boolean
  /** 是否被裁剪过 */
  trimmed: boolean
  /** 裁剪后在原图中的偏移和尺寸 */
  spriteSourceSize: Rect
  /** 原图尺寸 */
  sourceSize: { w: number; h: number }
  /** Sprite 名称 */
  name: string
  /** 原始文件名 */
  file: string
  /** 引用的图片对象 */
  image: RawImage
  /** 原始路径（与 file 可能不同） */
  originalFile?: string
  /** 跳过渲染（用于标识相同图片的克隆） */
  skipRender?: boolean
  /** 是否为克隆项 */
  cloned?: boolean
  /** 指向的原始 SpriteRect（相同图片检测） */
  identical?: SpriteRect
}

export interface ExportOptions {
  /** 下载的文件名-压缩包名（不含扩展名） */
  fileName: string
  /** 纹理输出名称 */
  textureName: string
  /** 纹理格式 png/jpg */
  textureFormat: 'png' | 'jpg'
  /** 是否移除文件扩展名 */
  removeFileExtension: boolean
  /** 是否保留文件夹前缀 */
  prependFolderName: boolean
  /** 纹理输出名称是否添加时间标签 */
  textureNameAddTimeTag: boolean,
  /** 导出的数据格式类型 */
  exporter: string
  /** 是否输出 Base64 编码 */
  base64Export: boolean
  /** 保存路径（Electron 专用） */
  savePath: string
  /** 是否启用 TinyPNG 压缩 */
  tinify: boolean
  /** TinyPNG API Key */
  tinifyKey: string
  /** 是否导出为压缩包 */
  exportAsZip: boolean
}

/** 打包参数选项 */
export interface PackOptions {
  /** 输出缩放比例 */
  scale: number
  /** 使用的图片滤镜类型 */
  filter: string
  /** 图集最大宽度 */
  width: number
  /** 图集最大高度 */
  height: number
  /** 是否使用固定尺寸（不自动缩放） */
  fixedSize: boolean
  /** 是否强制为 2 的幂次 */
  powerOfTwo: boolean
  /** 图片间距（像素） */
  padding: number
  /** 图片外扩（像素，用于消除缝隙） */
  extrude: number
  /** 是否允许旋转 */
  allowRotation: boolean
  /** 是否允许裁剪空白 */
  allowTrim: boolean
  /** 裁剪模式：trim 裁剪 / crop 只记录偏移 */
  trimMode: 'trim' | 'crop'
  /** Alpha 阈值（0-255，低于此值的像素视为透明） */
  alphaThreshold: number
  /** 是否检测并复用相同图片 */
  detectIdentical: boolean
  /** 使用的打包算法类型 */
  packer: string
  /** 打包算法的具体策略 */
  packerMethod: string
  /** 是否合并多组图集 */
  mergeAtlases: boolean
  /** 合并拼接方向 */
  mergeDirection: 'vertical' | 'horizontal'
}

/** 打包结果项（一个 Sheet = 一张图集图片 + 其 Sprite 数据） */
export interface PackResultItem {
  /** 所属组名 */
  group?: string
  /** 该 Sheet 中所有 Sprite 的排版信息 */
  data: SpriteRect[]
  /** 渲染后的图片 Base64 数据（data:image/png;base64,...） */
  imageData: string
  /** 图集宽度（像素） */
  width: number
  /** 图集高度（像素） */
  height: number
}

/** 导出文件描述 */
export interface ExportFile {
  /** 文件名 */
  name: string
  /** 文件内容（文本或 base64 字符串） */
  content: string
  /** content 是否为 base64 编码 */
  base64?: boolean
}

/** 导出格式定义 */
export interface ExporterDefinition {
  /** 格式类型标识（如 "JSON (hash)"、"cocos2d"） */
  type: string
  /** 格式描述 */
  description: string
  /** 是否支持裁剪 */
  allowTrim: boolean
  /** 是否支持旋转 */
  allowRotation: boolean
  /** Mustache 模板路径（旧版引用，当前 content 优先） */
  template?: string
  /** 输出文件扩展名（如 json, plist, xml） */
  fileExt: string
  /** 模板内容（通过 Vite ?raw 加载后缓存） */
  content?: string
  /** 是否为预定义格式 */
  predefined?: boolean
}

/** 国际化字符串表 */
export interface LocaleStrings {
  [key: string]: string
}
