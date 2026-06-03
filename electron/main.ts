/**
 * Electron 主进程
 * 窗口管理、原生菜单、项目文件、TinyPNG IPC、自动更新、窗口状态持久化、文件关联
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import path from 'path'
import fs from 'fs'

import type { FSWatcher } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | undefined
let fileWatcher: FSWatcher | undefined

/** 窗口状态 JSON 文件路径 */
const statePath = path.join(app.getPath('userData'), 'window-state.json')

/** 持久化的窗口尺寸和位置 */
interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

/** 从文件加载窗口状态，失败时返回默认尺寸 */
function loadWindowState(): WindowState {
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
    }
  } catch (e) { console.error('读取窗口状态失败:', e) }
  return { width: 1400, height: 800 }
}

/** 将当前窗口尺寸/位置保存到文件 */
function saveWindowState(): void {
  if (!mainWindow) return
  const bounds = mainWindow.getBounds()
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: mainWindow.isMaximized(),
  }
  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
  } catch (e) { console.error('保存窗口状态失败:', e) }
}

/** 最近项目列表 JSON 文件路径 */
const recentPath = path.join(app.getPath('userData'), 'recent-projects.json')

/** 从文件加载最近打开的项目路径列表，最多 10 条 */
function loadRecentProjects(): string[] {
  try {
    if (fs.existsSync(recentPath)) {
      return JSON.parse(fs.readFileSync(recentPath, 'utf-8'))
    }
  } catch { /* 静默忽略 */ }
  return []
}

/** 将项目路径加入最近列表（去重、插到最前、截断 10 条） */
function saveRecentProject(filePath: string): void {
  let recent = loadRecentProjects()
  recent = recent.filter((p) => p !== filePath)
  recent.unshift(filePath)
  if (recent.length > 10) recent = recent.slice(0, 10)
  try {
    fs.writeFileSync(recentPath, JSON.stringify(recent, null, 2))
  } catch (e) { console.error('保存最近项目失败:', e) }
}

/** 启动 .gftpp 文件变更监听，变化时通知渲染进程 */
function startFileWatcher(filePath: string): void {
  stopFileWatcher()

  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        mainWindow?.webContents.send('menu-action', 'file-changed', { filePath })
      }
    })
  } catch (err) {
    console.error('文件监听启动失败:', (err as Error).message)
  }
}

/** 停止文件变更监听 */
function stopFileWatcher(): void {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = undefined
  }
}
/** 支持的语言 */
type Language = 'zh-cn' | 'en'
/** 菜单项的国际化 key */
type MenuKey = 'file' | 'newProject' | 'openProject' | 'openRecent' | 'saveProject' | 'saveAs' | 'exit'

/** 根据系统区域判断是否使用中文 */
function canUseChinese() {
  const locale = app.getLocale()
  if (locale.startsWith('zh')) {
    return true
  }
  return false
}

/** 初始化语言和项目文件过滤器 */
function initLang() {
  if (canUseChinese()) {
    currentLang = 'zh-cn'
    PROJECT_FILTERS = PROJECT_FILTERS_CN;
  } else {
    currentLang = "en"
  }
}
/** 当前菜单语言 */
let currentLang: Language = 'en';
/** 项目文件对话框过滤器 */
let PROJECT_FILTERS = [{ name: "Texture Packaging Project", extensions: ['gftpp'] }]
/** 英文版文件过滤器 */
const PROJECT_FILTERS_EN = [{ name: "Texture Packaging Project", extensions: ['gftpp'] }]
/** 中文版文件过滤器 */
const PROJECT_FILTERS_CN = [{ name: "纹理打包项目", extensions: ['gftpp'] }]

/** 构建原生菜单栏（文件 → 新建/打开/保存/另存为/退出） */
function buildMenu(): void {
  const isMac = process.platform === 'darwin'

  const translations: Record<Language, Record<MenuKey, string>> = {
    'zh-cn': {
      file: '文件',
      newProject: '新建项目',
      openProject: '打开项目',
      openRecent: '打开最近',
      saveProject: '保存项目',
      saveAs: '另存为',
      exit: '退出',
    },
    en: {
      file: 'File',
      newProject: 'New Project',
      openProject: 'Open Project',
      openRecent: 'Open Recent',
      saveProject: 'Save Project',
      saveAs: 'Save As',
      exit: 'Quit',
    },
  }

  /** 根据当前语言取菜单文本 */
  const t = (key: MenuKey) => {
    return translations[currentLang][key]
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: isMac ? 'Free Group Texture Packer' : t('file'),
      submenu: [
        {
          label: t('newProject'),
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'project-new'),
        },
        {
          label: t('openProject'),
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenProject(),
        },
        {
          label: t('openRecent'),
          submenu: buildRecentProjectsMenu(),
        },
        { type: 'separator' },
        {
          label: t('saveProject'),
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'project-save'),
        },
        {
          label: t('saveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-action', 'project-save-as'),
        },
        { type: 'separator' },
        isMac
          ? { role: 'close', label: t('exit') }
          : { role: 'quit', label: t('exit') },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/** 构建「最近项目」子菜单列表 */
function buildRecentProjectsMenu(): MenuItemConstructorOptions[] {
  const recent = loadRecentProjects()
  if (!recent.length) {
    return [{ label: '(无)', enabled: false }]
  }
  return recent.map((filePath) => ({
    label: path.basename(filePath),
    click: () => handleOpenProject(filePath),
  }))
}


/** 项目文件数据（自由键值对） */
interface SaveProjectData {
  [key: string]: unknown
}

/** 打开项目文件：弹出对话框 → 读取 JSON → 发送给渲染进程 */
async function handleOpenProject(filePath?: string): Promise<void> {
  if (!filePath) {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: PROJECT_FILTERS,
      properties: ['openFile'],
    })
    if (result.canceled) return
    filePath = result.filePaths[0]
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const project = JSON.parse(content) as SaveProjectData
    mainWindow?.webContents.send('menu-action', 'project-loaded', { filePath, project })
    saveRecentProject(filePath)
    startFileWatcher(filePath)
    mainWindow?.setRepresentedFilename(filePath)
  } catch (err) {
    dialog.showErrorBox('打开失败', `无法打开项目文件: ${(err as Error).message}`)
  }
}

/** 保存项目文件：无路径则弹出另存为对话框，写入 JSON */
async function handleSaveProject(filePath: string | null, projectData: SaveProjectData): Promise<string | null> {
  if (!filePath) {
    console.log(PROJECT_FILTERS)
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: PROJECT_FILTERS,
      defaultPath: 'untitled.gftpp',
    })
    if (result.canceled) return null
    filePath = result.filePath!
  }
  try {
    fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2), 'utf-8')
    saveRecentProject(filePath)
    startFileWatcher(filePath)
    mainWindow?.setRepresentedFilename(filePath)
    return filePath
  } catch (err) {
    dialog.showErrorBox('保存失败', `无法保存项目文件: ${(err as Error).message}`)
    return null
  }
}

// === 窗口创建 ===
function createWindow(): void {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1100,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'public', 'favicon.svg'),
    show: false,
  })

  if (state.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = url.startsWith('http://localhost') || url.startsWith('file://')
    if (!isLocal) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('page-title-updated', (e) => e.preventDefault())

  mainWindow.on('resize', saveWindowState)
  mainWindow.on('move', saveWindowState)
  mainWindow.on('maximize', saveWindowState)
  mainWindow.on('unmaximize', saveWindowState)
  mainWindow.on('closed', stopFileWatcher)
  initLang();
  buildMenu()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})


// === 文件关联：处理从 OS 打开 .gftpp 文件 ===
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (mainWindow) {
    handleOpenProject(filePath)
  } else {
    app.once('ready', () => handleOpenProject(filePath))
  }
})

// === IPC handlers ===

/** 打开图片选择对话框 */
ipcMain.handle('dialog:openImages', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  })
  return result.filePaths
})

/** 递归扫描目录获取图片文件列表 */
interface ScannedImage {
  filePath: string
  name: string
}

function scanFolderForImages(dir: string): ScannedImage[] {
  const results: ScannedImage[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...scanFolderForImages(fullPath))
    } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)) {
      const relPath = path.relative(dir, fullPath)
      results.push({ filePath: fullPath, name: relPath })
    }
  }
  return results
}

/** 打开文件夹对话框选择图片目录 */
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'multiSelections'],
  })
  if (result.canceled || !result.filePaths.length) return []

  const allImages: Record<string, ScannedImage[]> = {}
  for (const dir of result.filePaths) {
    const dirName = path.basename(dir)
    const files = scanFolderForImages(dir)
    const dirImages: ScannedImage[] = [];
    for (const f of files) {
      dirImages.push({ filePath: f.filePath, name: dirName + '/' + f.name })
    }
    allImages[dirName] = dirImages;
  }
  return allImages
})

/** 选择保存目录 */
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  return result.filePaths[0] || null
})

/** 打开项目文件 */
ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: PROJECT_FILTERS,
    properties: ['openFile'],
  })
  if (result.canceled) return null

  const filePath = result.filePaths[0]
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const project = JSON.parse(content) as SaveProjectData
    saveRecentProject(filePath)
    startFileWatcher(filePath)
    return { filePath, project }
  } catch (err) {
    dialog.showErrorBox('打开失败', `无法打开项目文件: ${(err as Error).message}`)
    return null
  }
})

interface SaveData {
  filePath?: string | null
  project: SaveProjectData
}

/** 保存项目文件 */
ipcMain.handle('project:save', async (_event, data: SaveData) => {
  const result = await handleSaveProject(data.filePath ?? null, data.project)
  return result
})

ipcMain.handle('project:saveAs', async (_event, data: SaveProjectData) => {
  const result = await handleSaveProject(null, data)
  return result
})

interface TinifyData {
  key: string
  imageData: string
}

/** TinyPNG 压缩 */
ipcMain.handle('tinify', async (_event, data: TinifyData) => {
  try {
    const { default: tinify } = await import('tinify')
    tinify.key = data.key
    const buffer = Buffer.from(data.imageData, 'base64')
    const compressed = await tinify.fromBuffer(buffer).toBuffer()
    return { success: true as const, data: compressed.toString('base64') }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
})

/** 获取最近项目列表 */
ipcMain.handle('project:getRecent', async () => {
  return loadRecentProjects()
})

/** 导出文件项 */
interface ExportFile {
  name: string      /** 文件名 */
  content: string   /** 文件内容（文本或 base64 字符串） */
  base64?: boolean  /** content 是否为 base64 编码 */
}

/** 导出操作参数 */
interface ExportData {
  savePath: string              /** 保存目录 */
  files: ExportFile[]            /** 待保存的文件列表 */
  zipName: string                /** ZIP 压缩包名称 */
}

/** 导出文件保存到指定路径 */
ipcMain.handle('export:save', async (_event, data: ExportData) => {
  const { savePath, files, zipName } = data
  if (!savePath || !files?.length) return { success: false as const, error: '无效的保存路径' }

  try {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()

    for (const file of files) {
      if (file.base64) {
        zip.file(file.name, file.content, { base64: true })
      } else {
        zip.file(file.name, file.content)
      }
    }

    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    const outPath = path.join(savePath, `${zipName || 'export'}.zip`)
    fs.writeFileSync(outPath, buf)
    return { success: true as const, filePath: outPath }
  } catch (err) {
    return { success: false as const, error: (err as Error).message }
  }
})

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
// 获取图片 base64（支持 png / jpg / jpeg / gif / webp）
ipcMain.handle('file:getImageBase64', async (_, filePath: string): Promise<ImageBase64Result> => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const mime = mimeMap[ext] || 'image/png';
    const base64 = `data:${mime};base64,${buffer.toString('base64')}`;

    return { success: true, base64 };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// 读取文件夹文件列表
ipcMain.handle('fs:loadFolder', async (_, folderPath: string): Promise<ImageFileItem[]> => {
  try {
    if (!fs.existsSync(folderPath)) return [];

    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    const result: ImageFileItem[] = [];

    for (const file of files) {
      if (file.isFile()) {
        result.push({
          name: file.name,
          path: path.join(folderPath, file.name),
          folder: folderPath,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
});

ipcMain.handle('lang:change', (_event, lang: Language) => {
  currentLang = lang
  if (lang === "zh-cn") {
    PROJECT_FILTERS = PROJECT_FILTERS_CN;
  } else {
    PROJECT_FILTERS = PROJECT_FILTERS_EN;
  }
  buildMenu()
  return true
})