/**
 * 平台抽象接口
 * Web 和 Electron 模式通过 setPlatform 注入不同的实现
 */

import type { BaseRawImage, ExportOptions, PackOptions } from "@/app/types"
import type { Language } from "@/components/MainHeader"

/** 图片数据（平台无关的中间格式） */
export interface RawImageData {
  name: string
  data: string
  width: number
  height: number
  _base64: string
}

/** 项目数据结构 */
export interface ProjectData {
  version: string
  app: string
  packOptions: PackOptions
  exportOptions: ExportOptions
  groupImages: Record<string, string[]>,
  groups: string[],
  images: Record<string, BaseRawImage>,
}

/** 项目打开结果 */
export interface ProjectOpenResult {
  filePath: string
  project: ProjectData
}

/** 平台适配器接口 */
export interface PlatformAdapter {
  /** 打开文件选择窗口加载图片 */
  addImages(onComplete: (images: Record<string, RawImageData>) => void): void
  /** 选择文件夹加载图片（保留文件夹层级结构） */
  addFolder?(onComplete: (images: Record<string, Record<string, RawImageData>>) => void): void
  /** 下载文件（单文件或 ZIP 打包） */
  download(files: { name: string; content: string; base64?: boolean }[], zipName: string): Promise<boolean>
  /** 选择保存文件夹（Electron 专用） */
  selectFolder(): Promise<string | null>

  /** 打开项目文件（返回项目数据，Web 模式从 localStorage 加载） */
  openProject(): Promise<ProjectOpenResult | null>
  /** 保存项目文件（返回最终保存路径） */
  saveProject(project: ProjectData, filePath?: string): Promise<string | null>
  /** 另存为 */
  saveProjectAs(project: ProjectData): Promise<string | null>
  /** 获取最近打开的项目列表 */
  getRecentProjects(): Promise<string[]>

  changeLanguage?: (lang: Language) => void;
}

let platform: PlatformAdapter | null = null

export function setPlatform(p: PlatformAdapter) {
  platform = p
}

export function getPlatform(): PlatformAdapter {
  if (!platform) throw new Error('Platform not initialized')
  return platform
}
