/**
 * 导出引擎
 * 使用 Mustache 模板系统渲染 18 种格式的图集数据文件
 * 所有 .mst 模板在构建时通过 Vite ?raw 编译为字符串
 */
import Mustache from 'mustache'
import type { SpriteRect, ExporterDefinition } from '@/app/types'

import Cocos2dTemplate from '@/resources/exporters/Cocos2d.mst?raw'
import CssTemplate from '@/resources/exporters/Css.mst?raw'
import Egret2DTemplate from '@/resources/exporters/Egret2D.mst?raw'
import GodotAtlasTemplate from '@/resources/exporters/GodotAtlas.mst?raw'
import GodotTilesetTemplate from '@/resources/exporters/GodotTileset.mst?raw'
import JsonArrayTemplate from '@/resources/exporters/JsonArray.mst?raw'
import JsonHashTemplate from '@/resources/exporters/JsonHash.mst?raw'
import OldCssTemplate from '@/resources/exporters/OldCss.mst?raw'
import Phaser3Template from '@/resources/exporters/Phaser3.mst?raw'
import SpineTemplate from '@/resources/exporters/Spine.mst?raw'
import StarlingTemplate from '@/resources/exporters/Starling.mst?raw'
import UIKitTemplate from '@/resources/exporters/UIKit.mst?raw'
import Unity3DTemplate from '@/resources/exporters/Unity3D.mst?raw'
import UnrealTemplate from '@/resources/exporters/Unreal.mst?raw'
import XMLTemplate from '@/resources/exporters/XML.mst?raw'

/** 格式标识 → Mustache 模板映射表 */
const templateMap: Record<string, string> = {
  'JSON (hash)': JsonHashTemplate,
  'JSON (array)': JsonArrayTemplate,
  'XML': XMLTemplate,
  'css (modern)': CssTemplate,
  'css (old)': OldCssTemplate,
  'pixi.js': JsonHashTemplate,
  'Godot (atlas)': GodotAtlasTemplate,
  'Godot (tileset)': GodotTilesetTemplate,
  'Phaser (hash)': JsonHashTemplate,
  'Phaser (array)': JsonArrayTemplate,
  'Phaser 3': Phaser3Template,
  'Spine': SpineTemplate,
  'cocos2d': Cocos2dTemplate,
  'Starling': StarlingTemplate,
  'UIKit': UIKitTemplate,
  'UnrealEngine': UnrealTemplate,
  'Unity3D': Unity3DTemplate,
  'Egret2D': Egret2DTemplate,
}

export const exporters: ExporterDefinition[] = [
  { type: 'JSON (hash)', description: 'Json hash', allowTrim: true, allowRotation: true, fileExt: 'json', content: JsonHashTemplate },
  { type: 'JSON (array)', description: 'Json array', allowTrim: true, allowRotation: true, fileExt: 'json', content: JsonArrayTemplate },
  { type: 'XML', description: 'Plain XML format', allowTrim: true, allowRotation: true, fileExt: 'xml', content: XMLTemplate },
  { type: 'css (modern)', description: 'css format', allowTrim: true, allowRotation: true, fileExt: 'css', content: CssTemplate },
  { type: 'css (old)', description: 'old css format', allowTrim: false, allowRotation: false, fileExt: 'css', content: OldCssTemplate },
  { type: 'pixi.js', description: 'pixi.js format', allowTrim: true, allowRotation: true, fileExt: 'json', content: JsonHashTemplate },
  { type: 'Godot (atlas)', description: 'Godot Atlas format', allowTrim: true, allowRotation: true, fileExt: 'tpsheet', content: GodotAtlasTemplate },
  { type: 'Godot (tileset)', description: 'Godot Tileset format', allowTrim: true, allowRotation: true, fileExt: 'tpset', content: GodotTilesetTemplate },
  { type: 'Phaser (hash)', description: 'Phaser (json hash)', allowTrim: true, allowRotation: true, fileExt: 'json', content: JsonHashTemplate },
  { type: 'Phaser (array)', description: 'Phaser (json array)', allowTrim: true, allowRotation: true, fileExt: 'json', content: JsonArrayTemplate },
  { type: 'Phaser 3', description: 'Phaser 3', allowTrim: true, allowRotation: true, fileExt: 'json', content: Phaser3Template },
  { type: 'Spine', description: 'Spine atlas', allowTrim: true, allowRotation: true, fileExt: 'atlas', content: SpineTemplate },
  { type: 'cocos2d', description: 'cocos2d format', allowTrim: true, allowRotation: true, fileExt: 'plist', content: Cocos2dTemplate },
  { type: 'Starling', description: 'Starling format', allowTrim: true, allowRotation: true, fileExt: 'xml', content: StarlingTemplate },
  { type: 'UIKit', description: 'UIKit sprite sheet', allowTrim: true, allowRotation: false, fileExt: 'plist', content: UIKitTemplate },
  { type: 'UnrealEngine', description: 'UnrealEngine Paper2d', allowTrim: true, allowRotation: true, fileExt: 'paper2dsprites', content: UnrealTemplate },
  { type: 'Unity3D', description: 'Unity3D sprite sheet', allowTrim: true, allowRotation: false, fileExt: 'tpsheet', content: Unity3DTemplate },
  { type: 'Egret2D', description: 'Egret2D sprite sheet', allowTrim: false, allowRotation: false, fileExt: 'json', content: Egret2DTemplate },
]

/** 导出参数 */
interface ExportOptions {
  imageName: string          /** 图集文件名（不含扩展名） */
  imageFile: string          /** 图集文件名（含扩展名） */
  imageWidth: number         /** 图集宽度 */
  imageHeight: number        /** 图集高度 */
  scale: number              /** 输出缩放倍率 */
  removeFileExtension?: boolean  /** 是否移除 Sprite 文件名中的扩展名 */
  prependFolderName?: boolean    /** 是否保留文件夹前缀 */
  base64Export?: boolean         /** 是否导出 base64 编码 */
  base64Prefix?: string          /** base64 数据前缀 */
  imageData?: string             /** 图集图片的 base64 数据 */
}

/** 经过预计算的 Sprite 导出数据（供 Mustache 模板使用） */
interface PreparedRect {
  name: string                  /** Sprite 名称 */
  frame: { x: number; y: number; w: number; h: number; hw: number; hh: number }  /** 在图集中的位置和尺寸（hw=半宽, hh=半高） */
  spriteSourceSize: { x: number; y: number; w: number; h: number; offsetX: number; offsetY: number }  /** 裁剪偏移和尺寸（含 offset 补偿） */
  sourceSize: { w: number; h: number }  /** 原始图片尺寸 */
  rotated: string               /** 'true' / 'false' */
  trimmed: boolean              /** 是否被裁剪 */
  mirrorY: number               /** Y 轴镜像坐标（用于 Unity3D） */
  escapedName: string           /** 安全的变量名（特殊字符替换为 _） */
  last: boolean                 /** 是否为列表最后一项（模板中用于控制分隔符） */
}

/**
 * 预计算 Sprite 数据
 * 将所有数值字段按 scale 缩放，计算 hw/hh/offsetX/offsetY/mirrorY/escapedName
 */
function prepareRects(data: SpriteRect[], options: ExportOptions): PreparedRect[] {
  const rects = data.map((item) => {
    let name = item.originalFile || item.file
    if (options.removeFileExtension) {
      const parts = name.split('.')
      if (parts.length > 1) parts.pop()
      name = parts.join('.')
    }
    if (!options.prependFolderName) {
      name = name.split('/').pop() || name
    }

    const frame = {
      x: item.frame.x * options.scale,
      y: item.frame.y * options.scale,
      w: item.frame.w * options.scale,
      h: item.frame.h * options.scale,
      hw: (item.frame.w * options.scale) / 2,
      hh: (item.frame.h * options.scale) / 2,
    }

    const spriteSourceSize = {
      x: item.spriteSourceSize.x * options.scale,
      y: item.spriteSourceSize.y * options.scale,
      w: item.spriteSourceSize.w * options.scale,
      h: item.spriteSourceSize.h * options.scale,
      offsetX: item.spriteSourceSize.x * options.scale - ((item.sourceSize.w * options.scale) - (item.spriteSourceSize.w * options.scale)) / 2,
      offsetY: item.spriteSourceSize.y * options.scale - ((item.sourceSize.h * options.scale) - (item.spriteSourceSize.h * options.scale)) / 2,
    }

    const sourceSize = {
      w: item.sourceSize.w * options.scale,
      h: item.sourceSize.h * options.scale,
    }

    return {
      name,
      frame,
      spriteSourceSize,
      sourceSize,
      rotated: item.rotated ? 'true' : 'false',
      trimmed: item.trimmed,
      mirrorY: options.imageHeight - frame.y - frame.h,
      escapedName: name.replace(/[^\w]/g, '_'),
      last: false,
    }
  })

  if (rects.length > 0) {
    rects[rects.length - 1].last = true
  }

  return rects
}

/**
 * 渲染 Mustache 模板
 * @param template - 模板字符串
 * @param data - Sprite 数据
 * @param options - 导出参数
 * @returns 渲染后的字符串
 */
function renderTemplate(template: string, data: SpriteRect[], options: ExportOptions): string {
  const rects = prepareRects(data, options)

  const config: Record<string, unknown> = {
    imageName: options.imageName,
    imageFile: options.imageFile,
    imageWidth: options.imageWidth,
    imageHeight: options.imageHeight,
    scale: options.scale,
    format: 'RGBA8888',
  }

  if (options.base64Export && options.imageData) {
    config.base64Export = true
    config.base64Prefix = options.base64Prefix || 'data:image/png;base64,'
    config.imageData = options.imageData
  }

  const appInfo = {
    displayName: 'Free group texture packer',
    version: '0.1.0',
    url: 'https://github.com/kittlen/free-group-tex-packer',
  }

  const view = {
    rects,
    config,
    appInfo,
  }

  Mustache.parse(template)
  return Mustache.render(template, view)
}

/**
 * 导出核心函数
 * 查找对应格式的模板并渲染，未找到则回退到 JSON (hash)
 * @param data - Sprite 数据列表
 * @param format - 导出格式标识
 * @param options - 导出参数
 * @returns 渲染后的文本内容
 */
export function exportData(
  data: SpriteRect[],
  format: string,
  options: ExportOptions,
): string {
  const template = templateMap[format]
  if (template) {
    return renderTemplate(template, data, options)
  }
  return renderTemplate(JsonHashTemplate, data, options)
}
