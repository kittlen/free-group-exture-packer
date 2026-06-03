/**
 * Electron 平台适配
 * 通过 preload.js 暴露的 electronAPI 与主进程通信
 * 支持原生对话框、文件系统访问、项目文件 .gftpp
 */

import type { PlatformAdapter, RawImageData, ProjectData, ProjectOpenResult } from '../index'
import { usePackStore } from '@/app/store'
import type { Language } from '@/components/MainHeader';
import JSZip from 'jszip'
// 项目通用文件类型
export interface ImageFileItem {
  name: string;
  path: string;
  folder: string;
}

// 主进程返回的图片 base64 结构
export interface ImageBase64Result {
  success: boolean;
  base64?: string;
  error?: string;
}
interface ElectronAPI {
  openImages: () => Promise<string[]>
  openFolder: () => Promise<Record<string, { filePath: string; name: string }[]>>
  selectFolder: () => Promise<string | null>
  selectSavePath?: () => Promise<string | null>
  openProject: () => Promise<ProjectOpenResult>
  saveProject: (data: ProjectOpenResult) => Promise<string | null>
  saveProjectAs: (data: ProjectData) => Promise<string | null>
  getRecentProjects: () => Promise<string[]>
  onMenuAction: (callback: (action: string, data?: unknown) => void) => void
  tinify?: (data: { imageData: string; key: string }) => Promise<{ success: boolean; data: string; error?: string }>
  saveExport?: (data: { savePath: string; files: { name: string; content: string; base64?: boolean }[]; zipName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>
  loadFolder: (folderPath: string) => Promise<ImageFileItem[]>,
  getImageBase64: (filePath: string) => Promise<ImageBase64Result>,
  changeLanguage: (lang: Language) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}


/** 通过 file:// 协议加载本地图片 */
async function filePathToImageData(filePath: string): Promise<RawImageData | null> {
  if (!getAPI) {
    return null;;
  }
  const base64Result = await getAPI()?.getImageBase64(filePath)
  if (!base64Result || !base64Result.base64) {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const dataUrl = canvas.toDataURL('image/png')
      const name = filePath.split(/[/\\]/).pop() || filePath
      resolve({ name, data: dataUrl, width: img.width, height: img.height, _base64: base64Result.base64! })
    }
    img.onerror = () => resolve(null)
    img.src = base64Result.base64!
  })
}

/** 获取 electronAPI */
function getAPI(): ElectronAPI | undefined {
  return window.electronAPI
}

export class ElectronPlatform implements PlatformAdapter {
  /** 通过 Electron 原生对话框选择文件夹加载图片 */
  async addFolder?(onComplete: (images: Record<string, Record<string, RawImageData>>) => void): Promise<void> {
    const api = getAPI()
    if (!api?.openFolder) return
    const folderFiles = await api.openFolder()
    //filePath: 完整的路径
    const result: Record<string, Record<string, RawImageData>> = {}
    for (const key of Object.keys(folderFiles)) {
      const dirResult: Record<string, RawImageData> = {};
      for (const { filePath, name } of folderFiles[key]) {
        const data = await filePathToImageData(filePath)
        // if (data) dirResult[name] = { ...data, name }
        if (data) dirResult[filePath] = { ...data, name }
      }
      result[key] = dirResult;
    }
    onComplete(result)
  }

  /** 通过 Electron 原生对话框选择图片文件 */
  async addImages(onComplete: (images: Record<string, RawImageData>) => void): Promise<void> {
    const api = getAPI()
    if (!api?.openImages) {
      console.warn('electronAPI not available')
      return
    }

    const filePaths = await api.openImages()
    if (!filePaths.length) return

    const result: Record<string, RawImageData> = {}
    for (const fp of filePaths) {
      const data = await filePathToImageData(fp)
      // if (data) result[data.name] = data
      if (data) result[fp] = data
    }
    onComplete(result)
  }

  /** 下载文件（单文件或 ZIP），如配置了 savePath 则直接保存到本地 */
  async download(files: { name: string; content: string; base64?: boolean }[], zipName: string): Promise<boolean> {
    const savePath = usePackStore.getState().packOptions.savePath
    if (savePath) {
      const api = getAPI()
      if (api?.saveExport) {
        const result = await api.saveExport({ savePath, files, zipName })
        if (result.success) {
          return true;
        }
        console.warn('saveExport failed:', result.error)
      }
    }

    // 无 savePath 或 IPC 失败时回退到 blob 下载
    if (files.length === 1 && !files[0].base64) {
      const blob = new Blob([files[0].content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = files[0].name
      a.click()
      URL.revokeObjectURL(url)
      return true
    }

    const zip = new JSZip()
    for (const file of files) {
      if (file.base64) {
        zip.file(file.name, file.content, { base64: true })
      } else {
        zip.file(file.name, file.content)
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${zipName}.zip`
    a.click()
    URL.revokeObjectURL(url)
    return true
  }

  async selectFolder(): Promise<string | null> {
    const api = getAPI()
    if (!api?.selectFolder) return null
    return api.selectFolder()
  }

  // === 项目文件 .gftpp ===

  async openProject(): Promise<ProjectOpenResult | null> {
    const api = getAPI()
    if (!api?.openProject) return null
    return api.openProject()
  }

  async saveProject(project: ProjectData, filePath?: string): Promise<string | null> {
    const api = getAPI()
    if (!api?.saveProject) return null
    if (filePath) {
      return api.saveProject({ filePath, project })
    } else {
      return api.saveProjectAs(project);
    }
  }

  async saveProjectAs(project: ProjectData): Promise<string | null> {
    const api = getAPI()
    if (!api?.saveProjectAs) return null
    return api.saveProjectAs(project)
  }

  async getRecentProjects(): Promise<string[]> {
    const api = getAPI()
    if (!api?.getRecentProjects) return []
    return api.getRecentProjects()
  }

  changeLanguage(lang: Language): void {
    const api = getAPI()
    api?.changeLanguage(lang)
  }
}
