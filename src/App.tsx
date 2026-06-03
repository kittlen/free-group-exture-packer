/**
 * 应用根组件
 * 打包流程：添加图片 → 配置参数 → Pack → 预览结果 → Export 导出
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { App as AntApp, ConfigProvider, Layout, theme, Button, Spin, Typography, Select, Switch } from "antd"
import { ThunderboltOutlined, DownloadOutlined } from "@ant-design/icons"
import { useTranslation } from 'react-i18next'
import { usePackStore } from "@/app/store"
import { MainHeader } from "@/components/MainHeader"
import { MessageBox } from "@/components/MessageBox"
import { ProcessingShader } from "@/components/ProcessingShader"
import { OldBrowserBlocker } from "@/components/OldBrowserBlocker"
import { ImagesPanel } from "@/features/images/ImagesPanel"
import { PackPropertiesPanel } from "@/features/pack/PackPropertiesPanel"
import { PackResultsPanel } from "@/features/pack/PackResultsPanel"
import { PackProcessor } from "@/core/PackProcessor"
import { exportData, exporters } from "@/features/export/exporters"
import { TinyPngCompressor } from "@/features/filters/TinyPng"
import { getPlatform, setPlatform } from "@/platform"
import type { ProjectOpenResult } from "@/platform"
import { WebPlatform } from "@/platform/web"
import { ElectronPlatform } from "@/platform/electron"
import { Storage } from "@/utils/Storage"
import { antdLocaleMap } from "@/app/locale"
import "@/app/i18n"
import type { PackOptions } from "@/app/types"
import type { PackResultItem } from "@/app/types"
import { toBaseRawImage } from "./utils/storeStateUtil"
import LoadingView from "./components/Loading"
import { renderPackedTexture, stitchAtlases } from "./utils/packUtil"

const { Content, Sider } = Layout
const { Text } = Typography

const STORAGE_PACK_OPTIONS_KEY = "pack-options"

setPlatform(window.electronAPI ? new ElectronPlatform() : new WebPlatform())

function App() {
  const { message } = AntApp.useApp();
  const images = usePackStore((s) => s.images)
  const packOptions = usePackStore((s) => s.packOptions)
  const setCurrentProject = usePackStore((s) => s.setCurrentProject)
  const packResult = usePackStore((s) => s.packResult)
  const groups = usePackStore((s) => s.groups)
  const setPackOptions = usePackStore((s) => s.setPackOptions)
  const setPackResult = usePackStore((s) => s.setPackResult)
  const clearImages = usePackStore((s) => s.clearImages)
  const setShowShader = usePackStore((s) => s.setShowShader)
  const showShader = usePackStore((s) => s.showShader)
  const setMessageBox = usePackStore((s) => s.setMessageBox)
  const darkMode = usePackStore((s) => s.darkMode)
  const { t, i18n } = useTranslation()
  const [canLoading, setCanLoading] = useState<boolean>(false);

  // 加载保存的打包参数
  useEffect(() => {
    const saved = Storage.load(STORAGE_PACK_OPTIONS_KEY) as Partial<PackOptions> | null
    if (saved) {
      setPackOptions(saved)
    }
  }, [setPackOptions])

  // 暗色模式同步到 <html> 标签
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const buildProject = useCallback(() => {
    const storeState = usePackStore.getState()
    const project = {
      version: '1.0',
      app: t('APP_NAME'),
      packOptions: storeState.packOptions,
      groupImages: storeState.groupImages,
      groups: storeState.groups,
      images: toBaseRawImage(storeState.images),
    }
    return project;
  }, [t])

  const handleSaveProject = useCallback(async () => {
    const platform = getPlatform()
    const filePath = await platform.saveProject(buildProject(), usePackStore.getState().currentProject ?? undefined)
    if (filePath) {
      setCurrentProject(filePath)
      message.success(t('PROJECT_SAVED'))
    }
  }, [buildProject, setCurrentProject, message, t])

  // === 项目操作 ===
  const handleNewProject = useCallback(() => {
    const count = Object.keys(usePackStore.getState().images).length
    if (count > 0) {
      setMessageBox({
        content: t('SAVE_CHANGES_CONFIRM'),
        buttons: {
          save: {
            caption: t('SAVE'),
            callback: () => handleSaveProject(),
          },
          discard: {
            caption: t('SAVE_DISCARD'),
            callback: () => {
              clearImages()
              setPackResult(null)
              setCurrentProject(null)
            },
          },
          cancel: { caption: t('CANCEL') },
        },
      })
    } else {
      clearImages()
      setPackResult(null)
      setCurrentProject(null)
    }
  }, [clearImages, setPackResult, setMessageBox, setCurrentProject, handleSaveProject, t])

  const handleSaveProjectAs = useCallback(async () => {
    const platform = getPlatform()
    const filePath = await platform.saveProjectAs(buildProject())
    if (filePath) {
      setCurrentProject(filePath)
      message.success(t('PROJECT_SAVED'))
    }
  }, [buildProject, setCurrentProject, message, t])

  const handleProjectLoaded = useCallback(async (data: ProjectOpenResult) => {
    setCanLoading(true)
    if (data?.project?.packOptions) {
      setPackOptions(data.project.packOptions as Partial<PackOptions>)
    }
    if (data?.project?.groups && data?.project?.groupImages) {
      await usePackStore.getState().loadGroupData(data.project.groups, data.project.groupImages, data.project.images)
    }
    setCurrentProject(data.filePath)
    setCanLoading(false);
    message.success('项目已加载')

  }, [setPackOptions, setCurrentProject, message])

  const doPack = useCallback((showMessage = true) => {
    const state = usePackStore.getState()
    const { groups, groupImages, images } = state
    const allKeys = Object.keys(images)
    if (!allKeys.length) {
      setMessageBox({ content: t('NO_IMAGES_ERROR') })
      return
    }

    setShowShader(true)
    setTimeout(async () => {
      try {
        // 1. 按组分批打包
        const groupResults: { group: string; items: PackResultItem[] }[] = []
        for (const group of groups) {
          const groupKeys = (groupImages[group] || []).filter((k) => images[k])
          if (!groupKeys.length) continue
          const sheets = PackProcessor.pack(images, packOptions, groupKeys)
          const items: PackResultItem[] = sheets.map((sheet) => {
            const imageData = renderPackedTexture('', sheet.rects, sheet.width, sheet.height, packOptions)
            return { group, data: sheet.rects, imageData, width: sheet.width, height: sheet.height }
          })
          groupResults.push({ group, items })
        }

        // 2. 合并或平铺
        let results: PackResultItem[]
        if (packOptions.mergeAtlases && groupResults.length > 1) {
          results = await stitchAtlases(groupResults, packOptions.mergeDirection, packOptions.textureFormat)
        } else {
          results = groupResults.flatMap((r) => r.items)
        }

        setPackResult(results)
        if (showMessage) {
          message.success(t('PACK_COMPLETE', { 0: results.length }))
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('打包失败:', e)
        setMessageBox({ content: t('PACK_FAILED', { 0: msg }) })
      } finally {
        setShowShader(false)
      }
    }, 100)
  }, [packOptions, setPackResult, setShowShader, setMessageBox, message, t])

  // 自动打包：打包参数变化时
  useEffect(() => {
    if (Object.keys(usePackStore.getState().images).length) {
      doPack(false)
    }
  }, [packOptions, doPack])

  // 自动打包：图片顺序或分组内图片变化时
  const groupImages = usePackStore((s) => s.groupImages)
  const groupImagesStrRef = useRef(JSON.stringify(groupImages))
  useEffect(() => {
    const str = JSON.stringify(groupImages)
    if (str !== groupImagesStrRef.current && Object.keys(images).length) {
      doPack(false)
    }
    groupImagesStrRef.current = str
  }, [groupImages, doPack, images])

  // 自动打包：分组顺序变化时
  const groupsOrderStrRef = useRef(JSON.stringify(groups))
  useEffect(() => {
    const str = JSON.stringify(groups)
    if (str !== groupsOrderStrRef.current && Object.keys(images).length) {
      doPack(false)
    }
    groupsOrderStrRef.current = str
  }, [groups, doPack, images])

  // === 导出 ===
  const doExport = async () => {
    if (!packResult?.length) {
      setMessageBox({ content: t('PACK_FIRST') })
      return
    }

    const platform = getPlatform()
    const files: { name: string; content: string; base64?: boolean }[] = []

    for (let i = 0; i < packResult.length; i++) {
      const item = packResult[i]
      const groupSuffix = item.group && item.group !== 'default' ? `-${item.group}` : ''
      const fName = packOptions.textureName + groupSuffix + (packResult.length > 1 ? `-${i}` : '')
      const imageFile = `${fName}.${packOptions.textureFormat}`

      let imageContent = item.imageData.split(',')[1]

      // TinyPNG 压缩
      if (packOptions.tinify && packOptions.tinifyKey) {
        try {
          imageContent = await TinyPngCompressor.compress(imageContent, packOptions.tinifyKey, {
            textureFormat: packOptions.textureFormat,
          })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          message.warning(t('TINIFY_FAILED', { 0: msg }))
        }
      }

      // base64Export 决定图片输出方式
      if (packOptions.base64Export) {
        files.push({
          name: `${imageFile}.txt`,
          content: imageContent,
          base64: false,
        })
      } else {
        files.push({
          name: imageFile,
          content: imageContent,
          base64: true,
        })
      }

      // 数据文件
      const metaContent = exportData(item.data, packOptions.exporter, {
        imageName: fName,
        imageFile,
        imageWidth: item.width,
        imageHeight: item.height,
        scale: packOptions.scale,
      })

      const exporterDef = exporters.find((e) => e.type === packOptions.exporter)
      files.push({
        name: `${fName}.${exporterDef?.fileExt || 'json'}`,
        content: metaContent,
      })
    }

    const downloadResult = await platform.download(files, packOptions.fileName)
    if (downloadResult) {
      message.success(t('EXPORT_COMPLETE'))
    }
  };

  // === Electron 菜单命令监听 ===
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onMenuAction) return

    api.onMenuAction((action: string, data?: unknown) => {
      switch (action) {
        case 'project-new':
          handleNewProject()
          break
        case 'project-save':
          handleSaveProject()
          break
        case 'project-save-as':
          handleSaveProjectAs()
          break
        case 'project-loaded':
          handleProjectLoaded(data as ProjectOpenResult)
          break
        case 'file-changed':
          setMessageBox({
            content: t('FILE_CHANGED_PROMPT', { 0: (data as { filePath?: string })?.filePath }),
            buttons: {
              ok: {
                caption: t('FILE_CHANGED_RELOAD'),
                callback: () => {
                  handleProjectLoaded(data as ProjectOpenResult)
                },
              },
              cancel: { caption: t('FILE_CHANGED_IGNORE') },
            },
          })
          break
      }
    })
  }, [handleNewProject, handleSaveProject, handleSaveProjectAs, handleProjectLoaded, setMessageBox, t])
  if (canLoading) {
    return <LoadingView />;
  }

  return (
    <ConfigProvider
      locale={antdLocaleMap[i18n.language] ?? antdLocaleMap['en']}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { borderRadius: 6 },
      }}
    >
      <OldBrowserBlocker />

      <Layout className="min-h-screen">
        <MainHeader />

        <Layout className="flex-1 overflow-hidden">
          <Sider
            width={280}
            theme="light"
            className="border-r border-gray-200 dark:border-gray-700 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="px-4 pt-4 flex justify-between items-center shrink-0">
              <Text strong className="text-base">
                {t('IMAGE_LIST')}
              </Text>
            </div>
            <ImagesPanel />
          </Sider>

          <Layout className="overflow-hidden min-h-0">
            <Content className="p-6 overflow-hidden h-full">
              <div className="mb-4 flex gap-2 items-center shrink-0">
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => doPack()}
                  disabled={!Object.keys(images).length}
                >
                  {t('PACK_ACTION')}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={doExport}
                  disabled={!packResult?.length}
                >
                  {t('EXPORT')}
                </Button>
              </div>

              {groups.length > 1 && (
                <div className="mb-4 flex gap-4 items-center flex-wrap bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 cursor-pointer">
                    <Switch
                      size="small"
                      checked={packOptions.mergeAtlases}
                      onChange={(v) => setPackOptions({ mergeAtlases: v })}
                    />
                    {t('MERGE_ATLASES')}
                  </label>
                  {packOptions.mergeAtlases && (
                    <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      {t('MERGE_DIRECTION')}
                      <Select
                        size="small"
                        value={packOptions.mergeDirection}
                        onChange={(v) => setPackOptions({ mergeDirection: v as 'vertical' | 'horizontal' })}
                        options={[
                          { value: 'horizontal', label: t('MERGE_DIRECTION_VERTICAL') },
                          { value: 'vertical', label: t('MERGE_DIRECTION_HORIZONTAL') },
                        ]}
                      />
                    </label>
                  )}
                </div>
              )}

              <Spin spinning={showShader}>
                <PackResultsPanel />
              </Spin>
            </Content>
          </Layout>

          <Sider
            width={320}
            theme="light"
            className="border-r border-gray-200 dark:border-gray-700 min-h-0 overflow-hidden flex flex-col"
          >
            <PackPropertiesPanel />
          </Sider>
        </Layout>
      </Layout>

      <ProcessingShader visible={showShader} />
      <MessageBox />
    </ConfigProvider>
  )
}

export default App
