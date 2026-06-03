/**
 * Electron preload 脚本
 * 使用 contextBridge 安全地暴露主进程 API 给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron')

/**
 * 通过 contextBridge 安全暴露给渲染进程的 API 对象
 * @property {Function} openImages - 弹出文件选择对话框选择图片
 * @property {Function} openFolder - 弹出文件夹对话框，递归扫描图片
 * @property {Function} selectFolder - 弹出保存目录选择对话框
 * @property {Function} openProject - 打开 .gftpp 项目文件
 * @property {Function} saveProject - 保存项目到指定路径
 * @property {Function} saveProjectAs - 另存为项目文件
 * @property {Function} getRecentProjects - 获取最近项目列表
 * @property {Function} tinify - TinyPNG 图片压缩
 * @property {Function} saveExport - 保存导出文件到本地
 * @property {Function} loadFolder - 读取文件夹中的文件列表
 * @property {Function} getImageBase64 - 获取本地图片 base64 数据
 * @property {Function} onMenuAction - 监听原生菜单命令
 * @property {Function} changeLanguage - 通知主进程切换语言
 */
contextBridge.exposeInMainWorld('electronAPI', {
  openImages: () => ipcRenderer.invoke('dialog:openImages'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (data) => ipcRenderer.invoke('project:save', data),
  saveProjectAs: (data) => ipcRenderer.invoke('project:saveAs', data),
  getRecentProjects: () => ipcRenderer.invoke('project:getRecent'),

  tinify: (data) => ipcRenderer.invoke('tinify', data),

  saveExport: (data) => ipcRenderer.invoke('export:save', data),
  loadFolder: (folderPath) => ipcRenderer.invoke('fs:loadFolder', folderPath),
  getImageBase64: (filePath) => ipcRenderer.invoke('file:getImageBase64', filePath),


  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action, data) => callback(action, data))
  },
  changeLanguage: (lang) => {
    ipcRenderer.invoke("lang:change", lang)
  }
})
