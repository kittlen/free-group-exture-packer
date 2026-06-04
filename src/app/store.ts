import { create } from 'zustand'
import type { RawImage, PackOptions, PackResultItem, ExportOptions } from './types'
import { Storage } from '@/utils/Storage'
import { subscribeWithSelector } from 'zustand/middleware'
export const STORAGE_PACK_OPTIONS_KEY = 'pack-options'
export const STORAGE_EXPORT_OPTIONS_KEY = 'export-options'

export type OptionAtivakeType = "pack" | "export" | "other"

/**
 * 全局状态 store 接口
 * 使用 zustand 管理所有应用状态
 */
export interface PackStore {
  /** 当前项目文件路径（Web 模式下为 'localStorage'） */
  currentProject: string | null,
  /** 所有图片，key = 文件路径/标识 */
  images: Record<string, RawImage>
  /** 分组名称列表（有序） */
  groups: string[]
  /** 每个分组包含的图片 key 列表 */
  groupImages: Record<string, string[]>
  /** 当前激活的分组名 */
  activeGroup: string
  /** 打包参数配置 */
  packOptions: PackOptions
  /**导出参数 */
  exportOptions: ExportOptions
  optionAtiveKey: OptionAtivakeType
  /** 打包结果 */
  packResult: PackResultItem[] | null
  /** 被选中的图片 key 列表 */
  selectedImages: string[]
  /** 当前聚焦显示的图片 [activeGroup, path] */
  nowShowSelectedImages: string[] | null,
  /** 是否显示处理中遮罩 */
  showShader: boolean
  /** 通用消息弹窗 */
  messageBox: { content: string; buttons?: Record<string, { caption: string; callback?: () => void }> } | null
  /** 暗色模式 */
  darkMode: boolean

  /** 设置当前项目路径 */
  setCurrentProject: (currentProject: string | null) => void;
  /** 设置全量图片（会重置分组到 default） */
  setImages: (images: Record<string, RawImage>) => void
  /** 增量添加图片到指定组（或当前激活组） */
  addImages: (images: Record<string, RawImage>, group?: string) => void
  /** 从所有分组中移除指定图片 */
  removeImages: (keys: string[]) => void
  /** 清空所有图片和分组 */
  clearImages: () => void
  /** 清空指定分组内的图片 */
  clearGroupImages: (group: string) => void
  /** 创建一个新分组 */
  createGroup: (name: string) => void
  /** 删除分组（仅允许空分组） */
  deleteGroup: (name: string) => void
  /** 设置激活分组 */
  setActiveGroup: (name: string) => void
  /** 将图片移动到另一个分组 */
  moveImageToGroup: (key: string, toGroup: string) => void
  /** 重命名分组 */
  renameGroup: (name: string, newName: string) => void
  /** 将分组移到最前 */
  moveGroupTop: (name: string) => void
  /** 将分组上移一位 */
  moveGroupUp: (name: string) => void
  /** 将分组下移一位 */
  moveGroupDown: (name: string) => void
  /** 将分组移到最后 */
  moveGroupBottom: (name: string) => void
  /** 对分组内图片列表重新排序 */
  reorderGroupImages: (group: string, fromIndex: number, toIndex: number) => void
  /** 在分组内移动单张图片（上/下/置顶/置底） */
  moveImageInGroup: (group: string, key: string, direction: 'up' | 'down' | 'top' | 'bottom') => void
  /** 更新打包参数 */
  setPackOptions: (options: Partial<PackOptions>) => void
  /**更新导出参数 */
  setExportOptions: (options: Partial<ExportOptions>) => void
  /**更新当前激活的页面 */
  setOptionAtiveKey: (optionAtivakeType: OptionAtivakeType) => void
  /** 设置打包结果 */
  setPackResult: (result: PackResultItem[] | null) => void
  /** 设置选中的图片列表 */
  setSelectedImages: (keys: string[]) => void
  /** 切换图片选中状态（支持 Ctrl 多选） */
  toggleSelection: (path: string, ctrlKey: boolean) => void
  /** 清除选中 */
  clearSelection: () => void
  /** 显示/隐藏处理中遮罩 */
  setShowShader: (show: boolean) => void
  /** 设置消息弹窗 */
  setMessageBox: (msg: PackStore['messageBox']) => void
  /** 切换暗色模式（同时持久化到 localStorage） */
  setDarkMode: (dark: boolean) => void
  /** 加载分组数据（从项目文件恢复时调用，异步加载图片） */
  loadGroupData: (groups: string[], groupImages: Record<string, string[]>, images: Record<string, RawImage>) => Promise<void>
}

/** 默认打包参数 */
const defaultPackOptions: PackOptions = {


  scale: 1,
  filter: 'Original',
  width: 2048,
  height: 2048,
  fixedSize: false,
  powerOfTwo: false,
  padding: 2,
  extrude: 0,
  allowRotation: true,
  allowTrim: true,
  trimMode: 'trim',
  alphaThreshold: 0,
  detectIdentical: true,
  packer: 'None',
  packerMethod: 'ShortSideFit',
  mergeAtlases: false,
  mergeDirection: 'vertical',
}

const defaultExportOptions: ExportOptions = {
  textureName: 'texture',
  textureFormat: 'png',
  removeFileExtension: false,
  textureNameAddTimeTag: false,
  prependFolderName: true,
  exporter: 'JSON (hash)',
  base64Export: false,
  fileName: 'pack-result',
  savePath: '',
  tinify: false,
  tinifyKey: '',
  exportAsZip: false,
}

/**
 * zustand store：全局状态管理
 * 使用 subscribeWithSelector 中间件允许外部监听特定状态变化
 */
export const usePackStore = create<PackStore>()(subscribeWithSelector((set) => ({
  currentProject: null,
  images: {},
  groups: ['default'],
  groupImages: { default: [] },
  activeGroup: 'default',
  packOptions: { ...defaultPackOptions },
  exportOptions: { ...defaultExportOptions },
  optionAtiveKey: "pack",
  packResult: null,
  selectedImages: [],
  nowShowSelectedImages: null,
  showShader: false,
  messageBox: null,
  /** 从 localStorage 初始化暗色模式 */
  darkMode: localStorage.getItem('t-packer-darkmode') === 'true',
  /** 设置当前项目路径 */
  setCurrentProject: (currentProject: string | null) => set({ currentProject }),
  /** 全量设置图片，重置分组到 default */
  setImages: (images) => set({
    images,
    groups: ['default'],
    groupImages: { default: Object.keys(images) },
    activeGroup: 'default',
  }),

  /** 增量添加图片到指定组或当前激活组 */
  addImages: (newImages, group) =>
    set((state) => {
      let targetGroup = group || state.activeGroup
      if (!state.groups.includes(targetGroup)) {
        targetGroup = state.groups[0]
      }
      const images = { ...state.images, ...newImages }
      const newKeys = Object.keys(newImages).filter((k) => !state.images[k])
      const groupImages = { ...state.groupImages }
      groupImages[targetGroup] = [...(groupImages[targetGroup] || []), ...newKeys]
      return { images, groupImages }
    }),

  /** 从所有分组中移除指定图片（O(n) 实现，使用 Set） */
  removeImages: (keys) =>
    set((state) => {
      const images = { ...state.images }
      for (const key of keys) delete images[key]
      const keySet = new Set(keys)
      const groupImages: Record<string, string[]> = {}
      for (const g of state.groups) {
        groupImages[g] = (state.groupImages[g] || []).filter((k) => !keySet.has(k))
      }
      return { images, groupImages }
    }),

  /** 清空所有图片和分组 */
  clearImages: () => set({
    images: {},
    packResult: null,
    groups: ['default'],
    groupImages: { default: [] },
    activeGroup: 'default',
  }),

  /** 清空指定分组内所有图片 */
  clearGroupImages: (group) =>
    set((state) => {
      const keys = state.groupImages[group] || []
      const images = { ...state.images }
      for (const key of keys) delete images[key]
      const groupImages = { ...state.groupImages, [group]: [] }
      return { images, groupImages, packResult: null }
    }),

  /** 创建新分组（不允许重名） */
  createGroup: (name) => {
    set((state) => {
      const canUpdateTextureName = (state.groups.length == 0 || (state.groups.length == 1 && state.groups[0] === "default"))
      ///如果没有任何分组
      if (state.groups.includes(name)) return state
      const result: Partial<PackStore> = {
        groups: [...state.groups, name],
        groupImages: { ...state.groupImages, [name]: [] },
      }
      if (canUpdateTextureName) {
        result.exportOptions = { ...state.exportOptions, textureName: name };
      }
      return result;
    })
  },

  /** 删除分组（仅允许空分组，default 分组特殊处理） */
  deleteGroup: (name) =>
    set((state) => {
      if (name === 'default') {
        if ((state.groupImages['default'] || []).length > 0 || state.groups.length <= 1) return state
        const remaining = state.groups.filter((g) => g !== 'default')
        const gi = { ...state.groupImages }
        delete gi['default']
        return { groups: remaining, groupImages: gi, activeGroup: remaining[0] }
      }
      const keys = state.groupImages[name] || []
      if (keys.length) return state
      const groups = state.groups.filter((g) => g !== name)
      if (groups.length === 0) {
        return { groups: ['default'], groupImages: { default: [] }, activeGroup: 'default' }
      }
      const groupImages = { ...state.groupImages }
      delete groupImages[name]
      return { groups, groupImages, activeGroup: state.activeGroup === name ? groups[0] : state.activeGroup }
    }),

  /** 激活指定分组 */
  setActiveGroup: (name) => set({ activeGroup: name }),

  /** 将图片从当前分组移动到目标分组 */
  moveImageToGroup: (key, toGroup) =>
    set((state) => {
      const groupImages = { ...state.groupImages }
      for (const g of state.groups) {
        const idx = groupImages[g]?.indexOf(key)
        if (idx !== undefined && idx >= 0) {
          groupImages[g] = groupImages[g].filter((k) => k !== key)
          break
        }
      }
      groupImages[toGroup] = [...(groupImages[toGroup] || []), key]
      return { groupImages }
    }),

  /** 重命名分组（不能与已有分组重名） */
  renameGroup: (name, newName) =>
    set((state) => {
      if (name === newName || !state.groups.includes(name) || state.groups.includes(newName)) return state
      return {
        groups: state.groups.map((g) => (g === name ? newName : g)),
        groupImages: Object.fromEntries(
          Object.entries(state.groupImages).map(([k, v]) => [k === name ? newName : k, v]),
        ),
        activeGroup: state.activeGroup === name ? newName : state.activeGroup,
      }
    }),

  /** 将分组移到最前 */
  moveGroupTop: (name) => {
    set((state) => {
      if (state.groups[0] === name) return state;
      const newGroups = [name, ...state.groups.filter((g) => g !== name)];
      return { groups: newGroups };
    })
  },
  /** 将分组上移一位 */
  moveGroupUp: (name) =>
    set((state) => {
      const idx = state.groups.indexOf(name)
      if (idx <= 0) return state
      const groups = [...state.groups]
        ;[groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]]
      return { groups }
    }),

  /** 将分组下移一位 */
  moveGroupDown: (name) =>
    set((state) => {
      const idx = state.groups.indexOf(name)
      if (idx < 0 || idx >= state.groups.length - 1) return state
      const groups = [...state.groups]
        ;[groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]]
      return { groups }
    }),
  /** 将分组的最后 */
  moveGroupBottom: (name) => {
    set((state) => {
      if (state.groups[state.groups.length - 1] === name) return state;
      const newGroups = [...state.groups.filter((g) => g !== name), name];
      return { groups: newGroups };
    })
  },

  /** 重新排序分组内的图片列表 */
  reorderGroupImages: (group, fromIndex, toIndex) =>
    set((state) => {
      const arr = [...(state.groupImages[group] || [])]
      if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) return state
      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)
      return { groupImages: { ...state.groupImages, [group]: arr } }
    }),

  /** 在分组内移动图片顺序 */
  moveImageInGroup: (group, key, direction) =>
    set((state) => {
      const arr = [...(state.groupImages[group] || [])]
      const idx = arr.indexOf(key)
      if (idx < 0) return state
      if (direction === 'up' && idx > 0) {
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      } else if (direction === 'down' && idx < arr.length - 1) {
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      } else if (direction === 'top' && idx > 0) {
        arr.splice(idx, 1)
        arr.unshift(key)
      } else if (direction === 'bottom' && idx < arr.length - 1) {
        arr.splice(idx, 1)
        arr.push(key)
      } else {
        return state
      }
      return { groupImages: { ...state.groupImages, [group]: arr } }
    }),

  /** 更新打包参数（自动持久化到 localStorage） */
  setPackOptions: (options) =>
    set((state) => {
      const next = { ...state.packOptions, ...options }
      Storage.save(STORAGE_PACK_OPTIONS_KEY, next)
      return { packOptions: next }
    }),
  /**更新导出参数 */
  setExportOptions: (options) =>
    set((state) => {
      const next = { ...state.exportOptions, ...options }
      Storage.save(STORAGE_EXPORT_OPTIONS_KEY, next)
      return { exportOptions: next }
    }),
  setOptionAtiveKey: (optionAtiveKey) => {
    set((_state) => {
      return { optionAtiveKey }
    })
  },
  /** 加载全量分组数据（异步加载所有图片的 HTMLImageElement） */
  loadGroupData: async (groups: string[], groupImages: Record<string, string[]>, images: Record<string, RawImage>) => {
    const promises = Object.values(images).map(async (value: RawImage) => {
      if (!value || !value._base64) return;
      if (value.img) return;
      let base64 = value._base64;
      if (!base64.startsWith("data:image")) {
        base64 = `data:image/png;base64,${base64}`;
        value._base64 = base64;
      }
      const img = new Image();

      await new Promise<void>((resolve, _reject) => {
        img.onload = () => {
          resolve();
        };
        img.onerror = (e) => {
          console.error("图片加载失败", e);
          resolve();
        };
        img.src = base64;
      });

      value.img = img;
    });

    await Promise.all(promises);
    set({ groups, groupImages, images })
  },
  /** 设置打包结果 */
  setPackResult: (result) => set({ packResult: result }),
  /** 直接设置选中图片列表 */
  setSelectedImages: (keys) => set({ selectedImages: keys }),
  /** 切换图片选中（Ctrl 多选，否则单选并自动切换分组） */
  toggleSelection: (path, ctrlKey) =>
    set((state) => {
      if (ctrlKey) {
        const exists = state.selectedImages.includes(path)
        return {
          selectedImages: exists
            ? state.selectedImages.filter((p) => p !== path)
            : [...state.selectedImages, path],
        }
      }
      let activeGroup = state.activeGroup;
      for (const group of state.groups) {
        const groupList = state.groupImages[group]
        if (groupList?.includes(path)) {
          activeGroup = group
          break
        }
      }
      return { selectedImages: [path], activeGroup, nowShowSelectedImages: [activeGroup, path] }
    }),
  /** 清除选中 */
  clearSelection: () => set({ selectedImages: [], nowShowSelectedImages: null }),
  /** 显示/隐藏处理中遮罩 */
  setShowShader: (show) => set({ showShader: show }),
  /** 设置消息弹窗 */
  setMessageBox: (msg) => set({ messageBox: msg }),
  /** 切换暗色模式并持久化到 localStorage */
  setDarkMode: (dark: boolean) => {
    localStorage.setItem('t-packer-darkmode', String(dark))
    set({ darkMode: dark })
  },
})))
