/**
 * Web 平台适配
 * 使用 HTML File Input 加载图片，使用 FileSaver 下载
 * 项目存储使用 localStorage
 */

import type { PlatformAdapter, RawImageData, ProjectData, ProjectOpenResult } from '../index'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { extractFolderPrefix } from '@/utils/file'

const PROJECT_KEY = 't-packer-project'
const RECENT_KEY = 't-packer-recent'

export class WebPlatform implements PlatformAdapter {
  /** 通过文件选择器选择文件夹加载图片 */
  addFolder?(onComplete: (images: Record<string, Record<string, RawImageData>>) => void): void {
    const input = document.createElement('input')
    input.type = 'file';
    (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
    (input as HTMLInputElement & { mozdirectory: boolean }).mozdirectory = true;
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files
      if (!files) return
      const result: Record<string, Record<string, RawImageData>> = {};
      const dirResult: Record<string, RawImageData> = {}
      for (const file of files) {
        if (!/\.(png|jpg|jpeg|gif)$/i.test(file.name)) continue
        const data = await this.fileToBase64(file)
        const img = new Image()
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const name = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
            dirResult[name] = { name, data, width: img.width, height: img.height, _base64: data }
            resolve()
          }
          img.src = data
        })
      }
      const dirName = extractFolderPrefix(Object.keys(dirResult)) ?? "default";
      result[dirName] = dirResult;
      onComplete(result)
    }
    input.click()
  }

  addImages(onComplete: (images: Record<string, RawImageData>) => void): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/png,image/jpg,image/jpeg,image/gif'

    input.onchange = async () => {
      const files = input.files
      if (!files) return

      const result: Record<string, RawImageData> = {}

      for (const file of files) {
        const data = await this.fileToBase64(file)
        const img = new Image()
        await new Promise<void>((resolve) => {
          img.onload = () => {
            // result[file.name] = { name: file.name, data, width: img.width, height: img.height, _base64: data }
            result[file.webkitRelativePath] = { name: file.name, data, width: img.width, height: img.height, _base64: data }
            resolve()
          }
          img.src = data
        })
      }
      onComplete(result)
    }

    input.click()
  }

  async download(files: { name: string; content: string; base64?: boolean }[], zipName: string): Promise<boolean> {
    if (files.length === 1 && !files[0].base64) {
      const blob = new Blob([files[0].content], { type: 'text/plain' })
      saveAs(blob, files[0].name)
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

    zip.generateAsync({ type: 'blob' }).then((blob) => {
      saveAs(blob, `${zipName}.zip`)
    })
    return true;
  }

  async selectFolder(): Promise<string | null> {
    return null
  }

  // === 项目文件（Web 模式使用 localStorage） ===

  async openProject(): Promise<ProjectOpenResult | null> {
    try {
      const raw = localStorage.getItem(PROJECT_KEY)
      if (!raw) return null
      const project = JSON.parse(raw) as ProjectData
      return { filePath: 'localStorage', project }
    } catch {
      return null
    }
  }

  async saveProject(_project: ProjectData, _filePath?: string): Promise<string | null> {
    console.log("web暂不保存")
    return null;
    // try {
    //   localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
    //   this.addRecent('localStorage')
    //   return 'localStorage'
    // } catch {
    //   return null
    // }
  }

  async saveProjectAs(project: ProjectData): Promise<string | null> {
    return this.saveProject(project)
  }

  async getRecentProjects(): Promise<string[]> {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
