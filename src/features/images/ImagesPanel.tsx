import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { Button, Upload, Space, Typography, Select, Input, Dropdown, Modal } from 'antd'
import {
  UploadOutlined, DeleteOutlined, ClearOutlined, FolderOpenOutlined, FolderOutlined,
  UpOutlined, DownOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined,
  PlusOutlined, EditOutlined,
} from '@ant-design/icons'
import { usePackStore } from '@/app/store'
import type { RawImage } from '@/app/types'
import JSZip from 'jszip'
import i18n from '@/app/i18n'
import { getPlatform } from '@/platform'
import { extractFolderPrefix, getFileNameFromPath } from '@/utils/file'
import { App } from 'antd'

const { Text } = Typography

/** 将 File 对象读取为 base64 格式的 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 从 data URL 加载图片获取宽高 */
async function loadImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}

/** 解压 ZIP 文件并将其中的图片提取为 RawImage 格式 */
async function processZipFile(file: File): Promise<Record<string, RawImage>> {
  const zip = new JSZip()
  const zipData = await zip.loadAsync(file)
  const newImages: RawImage[] = []
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif']
  const entries = Object.entries(zipData.files)
  for (const [name, entry] of entries) {
    if (entry.dir) continue
    if (!imageExts.some((ext) => name.toLowerCase().endsWith(ext))) continue
    const blob = await entry.async('blob')
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    const { width, height } = await loadImage(dataUrl)
    const img = new Image()
    img.src = dataUrl
    newImages.push({
      name: name.split('/').pop() || name,
      file: name,
      width, height,
      _base64: dataUrl.split(',')[1],
      img,
    })
  }
  const result: Record<string, RawImage> = {}
  for (const item of newImages) result[item.file] = item
  return result
}

/** 递归遍历 FileSystemEntry 获取所有文件（处理拖拽目录） */
async function traverseEntry(entry: FileSystemEntry, basePath: string): Promise<File[]> {
  const files: File[] = []
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    const file = await new Promise<File>((resolve) => fileEntry.file(resolve))
    Object.defineProperty(file, 'webkitRelativePath', { value: basePath + file.name })
    files.push(file)
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry
    const reader = dirEntry.createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve))
    for (const child of entries) {
      const childFiles = await traverseEntry(child, basePath + entry.name + '/')
      files.push(...childFiles)
    }
  }
  return files
}

export function ImagesPanel() {
  const { message } = App.useApp();
  const images = usePackStore((s) => s.images)
  const groups = usePackStore((s) => s.groups)
  const groupImages = usePackStore((s) => s.groupImages)
  const activeGroup = usePackStore((s) => s.activeGroup)
  const addImages = usePackStore((s) => s.addImages)
  const removeImages = usePackStore((s) => s.removeImages)
  const clearGroupImages = usePackStore((s) => s.clearGroupImages)
  const selectedImages = usePackStore((s) => s.selectedImages)
  const toggleSelection = usePackStore((s) => s.toggleSelection)
  const createGroup = usePackStore((s) => s.createGroup)
  const deleteGroup = usePackStore((s) => s.deleteGroup)
  const renameGroup = usePackStore((s) => s.renameGroup)
  const setActiveGroup = usePackStore((s) => s.setActiveGroup)
  const moveImageToGroup = usePackStore((s) => s.moveImageToGroup)
  const moveImageInGroup = usePackStore((s) => s.moveImageInGroup)
  const moveGroupTop = usePackStore((s) => s.moveGroupTop)
  const moveGroupUp = usePackStore((s) => s.moveGroupUp)
  const moveGroupDown = usePackStore((s) => s.moveGroupDown)
  const moveGroupBottom = usePackStore((s) => s.moveGroupBottom)
  const reorderGroupImages = usePackStore((s) => s.reorderGroupImages)
  const clearImages = usePackStore((s) => s.clearImages)
  const packOptions = usePackStore((s) => s.packOptions)

  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragFromGroup, setDragFromGroup] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ default: true })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createGroupName, setCreateGroupName] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')

  const scrollWrapRef = useRef<HTMLDivElement>(null)
  const processFiles = useCallback(async (files: File[], nameMapper?: (f: File) => string): Promise<Record<string, RawImage>> => {
    const newImages: Record<string, RawImage> = {}
    for (const file of files) {
      try {
        const dataUrl = await fileToBase64(file)
        const { width, height } = await loadImage(dataUrl)
        const img = new Image()
        img.src = dataUrl
        const key = nameMapper ? nameMapper(file) : file.name
        newImages[key] = {
          name: file.name,
          file: key,
          width, height,
          _base64: dataUrl.split(',')[1],
          img,
        }
      } catch {
        message.warning(i18n.t('IMG_LOAD_FAILED', { 0: file.name }))
      }
    }
    return newImages
  }, [message])

  const toggleGroupExpand = useCallback((group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }, [])

  useEffect(() => {
    const sub = usePackStore.subscribe((s) => s.nowShowSelectedImages, (n, _o) => {
      if (!n) {
        return;
      }
      const [activeGroup, path] = n;
      setExpandedGroups((prev) => ({ ...prev, [activeGroup]: true }))
      const key = path;
      if (!key) {
        return;
      }
      setTimeout(() => {
        const wrap = scrollWrapRef.current
        if (!wrap) return
        // 在滚动容器内通过data-key精准查找目标DOM（不用ref）
        const target = wrap.querySelector(`[data-key="${key}"]`) as HTMLElement
        if (!target) return

        // 方式1：元素自动滚入可视（推荐平滑）
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center' // start置顶 / center居中 / end置底
        })
      }, 300);
    })
    return sub;
  }, [scrollWrapRef])

  /** 计算每组有效图片数 */
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const g of groups) {
      counts[g] = (groupImages[g] || []).filter((k) => images[k]).length
    }
    return counts
  }, [groups, groupImages, images])

  const totalImageCount = groups.reduce((sum, g) => sum + groupCounts[g], 0)

  /** 拿到当前组内有效 key 列表 */
  const getGroupKeys = useCallback(
    (group: string) => (groupImages[group] || []).filter((k) => images[k]),
    [groupImages, images],
  )

  /** 文件夹选择（Web + Electron）*/
  const handleFolderClick = useCallback(() => {
    const platform = getPlatform()
    if (platform.addFolder) {
      platform.addFolder((newAllImages) => {
        let allCount: number = 0;
        for (const prefix of Object.keys(newAllImages)) {
          const newImages = newAllImages[prefix]
          const result: Record<string, RawImage> = {}
          for (const [k, v] of Object.entries(newImages)) {
            allCount++;
            const dataUrl = v.data.startsWith('data:') ? v.data : `data:image/png;base64,${v.data}`
            const img = new Image()
            img.src = dataUrl
            result[k] = {
              name: v.name,
              file: k,
              width: v.width,
              height: v.height,
              _base64: v.data.split(',')[1] || v.data,
              img,
            }
          }
          if (prefix && !groups.includes(prefix)) {
            createGroup(prefix)
            setActiveGroup(prefix)
            addImages(result, prefix)
            const st = usePackStore.getState()
            if (st.groupImages['default']?.length === 0) st.deleteGroup('default')
          } else {
            addImages(result)
          }
        }
        message.success(i18n.t('IMG_ADD_SUCCESS', { 0: allCount }))
      })
    } else {
      const input = document.createElement('input')
      input.type = 'file'
        ; (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true
      input.onchange = async () => {
        const files = input.files
        if (!files) return
        const fileArr = Array.from(files).filter((f) => /\.(png|jpg|jpeg|gif)$/i.test(f.name))
        const newImages = await processFiles(
          fileArr,
          (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        )
        const keys = Object.keys(newImages)
        const prefix = extractFolderPrefix(keys)
        if (prefix && !groups.includes(prefix)) {
          createGroup(prefix)
          setActiveGroup(prefix)
          addImages(newImages, prefix)
          const st = usePackStore.getState()
          if (st.groupImages['default']?.length === 0) st.deleteGroup('default')
        } else {
          addImages(newImages)
        }
        message.success(i18n.t('IMG_ADD_SUCCESS', { 0: keys.length }))
      }
      input.click()
    }
  }, [addImages, createGroup, setActiveGroup, groups, processFiles, message])

  /** 拖拽导入 */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const items = Array.from(e.dataTransfer.items)
      const dirEntries: FileSystemEntry[] = []
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.()
        if (entry?.isDirectory) dirEntries.push(entry)
      }
      if (dirEntries.length > 0) {
        let allKeyCount = 0;
        for (const entry of dirEntries) {
          const allFiles: File[] = []
          const files = await traverseEntry(entry, '')
          allFiles.push(...files)
          const imageFiles = allFiles.filter((f) => /\.(png|jpg|jpeg|gif)$/i.test(f.name))
          if (!imageFiles.length) return
          const newImages = await processFiles(imageFiles, (f) => f.webkitRelativePath || f.name)
          const keys = Object.keys(newImages)
          const prefix = extractFolderPrefix(keys)
          if (prefix && !usePackStore.getState().groups.includes(prefix)) {
            usePackStore.getState().createGroup(prefix)
            usePackStore.getState().setActiveGroup(prefix)
            addImages(newImages, prefix)
            const st = usePackStore.getState()
            if (st.groupImages['default']?.length === 0) st.deleteGroup('default')
          } else {
            addImages(newImages)
          }
          allKeyCount += keys.length;
        }
        message.success(i18n.t('IMG_ADD_SUCCESS', { 0: allKeyCount }))
        return
      }
      const files = Array.from(e.dataTransfer.files)
      if (!files.length) return
      const zipFile = files.find((f) => f.name.endsWith('.zip'))
      if (zipFile) {
        const newImages = await processZipFile(zipFile)
        addImages(newImages)
        message.success(i18n.t('ZIP_IMPORT_SUCCESS', { 0: Object.keys(newImages).length }))
        return
      }
      const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|gif)$/i.test(f.name))
      if (!imageFiles.length) return
      const newImages = await processFiles(imageFiles)
      addImages(newImages)
      message.success(i18n.t('IMG_ADD_SUCCESS', { 0: Object.keys(newImages).length }))
    },
    [addImages, processFiles, message],
  )

  const handleDelete = useCallback(() => {
    const selected = usePackStore.getState().selectedImages
    if (selected.length) {
      removeImages(selected)
      message.success(i18n.t('IMG_DELETE_SUCCESS', { 0: selected.length }))
    }
  }, [removeImages, message])

  const handleClear = useCallback(() => {
    const count = groupCounts[activeGroup]
    if (!count) return
    Modal.confirm({
      title: i18n.t('CLEAR_GROUP_CONFIRM', { 0: activeGroup, 1: count }),
      okText: i18n.t('OK'),
      cancelText: i18n.t('CANCEL'),
      onOk: () => { clearGroupImages(activeGroup) },
    })
  }, [activeGroup, groupCounts, clearGroupImages])

  const handleItemClick = useCallback(
    (group: string, key: string, e: React.MouseEvent) => {
      setActiveGroup(group)
      toggleSelection(key, e.ctrlKey || e.shiftKey)
    },
    [setActiveGroup, toggleSelection],
  )

  /** 组内拖拽排序 */
  const handleDragStart = useCallback(
    (group: string, index: number, e: React.DragEvent) => {
      setDragFromGroup(group)
      setDragIdx(index)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', `${group}::${index}`)
    },
    [],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDropOnItem = useCallback(
    (targetGroup: string, targetIndex: number, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const data = e.dataTransfer.getData('text/plain')
      const [fromGroup, fromIdxStr] = data.split('::')
      const fromIdx = Number(fromIdxStr)
      if (!fromGroup || isNaN(fromIdx)) return
      if (fromGroup === targetGroup) {
        reorderGroupImages(targetGroup, fromIdx, targetIndex)
      }
      setDragIdx(null)
      setDragFromGroup(null)
    },
    [reorderGroupImages],
  )

  /** 跨组拖放（移到其他组的头部区域） */
  const handleDropOnGroupHeader = useCallback(
    (targetGroup: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const data = e.dataTransfer.getData('text/plain')
      const [fromGroup, fromIdxStr] = data.split('::')
      if (!fromGroup || fromGroup === targetGroup) return
      const keys = getGroupKeys(fromGroup)
      const key = keys[Number(fromIdxStr)]
      if (key) {
        moveImageToGroup(key, targetGroup)
      }
      setDragIdx(null)
      setDragFromGroup(null)
    },
    [getGroupKeys, moveImageToGroup],
  )

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDragFromGroup(null)
  }, [])

  /** 创建组弹窗 */
  const openCreateModal = useCallback(() => {
    setCreateGroupName('')
    setCreateModalOpen(true)
  }, [])

  const confirmCreateGroup = useCallback(() => {
    const name = createGroupName.trim()
    if (!name) return
    if (groups.includes(name)) {
      message.warning(i18n.t('GROUP_EXISTS'))
      return
    }
    createGroup(name)
    setActiveGroup(name)
    setCreateModalOpen(false)
  }, [createGroupName, groups, createGroup, setActiveGroup, message])

  /** 编辑组弹窗 */
  const openEditModal = useCallback(() => {
    setEditGroupName(activeGroup)
    setEditModalOpen(true)
  }, [activeGroup])

  const confirmEditGroup = useCallback(() => {
    const newName = editGroupName.trim()
    if (!newName || newName === activeGroup) {
      setEditModalOpen(false)
      return
    }
    if (groups.includes(newName)) {
      message.warning(i18n.t('GROUP_EXISTS'))
      return
    }
    renameGroup(activeGroup, newName)
    setEditModalOpen(false)
  }, [editGroupName, activeGroup, groups, renameGroup, message])

  const confirmDeleteFromEdit = useCallback(() => {
    if (activeGroup === 'default') return
    const st = usePackStore.getState()
    const count = (st.groupImages[activeGroup] || []).length
    if (count > 0) {
      message.warning(i18n.t('GROUP_HAS_IMAGES_WARNING', { 0: count }))
      return
    }
    Modal.confirm({
      title: i18n.t('DELETE_GROUP_CONFIRM', { 0: activeGroup }),
      okText: i18n.t('OK'),
      cancelText: i18n.t('CANCEL'),
      onOk: () => {
        deleteGroup(activeGroup)
        setEditModalOpen(false)
      },
    })
  }, [activeGroup, deleteGroup, message])

  const isNoneMode = packOptions.packer === 'None'

  /** 构建该图片可移入的组列表 */
  const getMoveToGroups = useCallback(
    (key: string) => {
      return groups.filter((g) => !(groupImages[g] || []).includes(key))
    },
    [groups, groupImages],
  )

  /** 图片项渲染 */
  const renderImageItem = (group: string, key: string, index: number) => {
    const img = images[key]
    if (!img) return null
    const isSelected = selectedImages.includes(key)
    const parts = key.split('/')
    const fileName = parts[parts.length - 1]
    const moveGroups = getMoveToGroups(key)
    const menuItems = [
      ...(isNoneMode
        ? [
          { key: 'top', icon: <VerticalAlignTopOutlined />, label: i18n.t('MOVE_TOP'), onClick: () => moveImageInGroup(group, key, 'top') },
          { key: 'up', icon: <UpOutlined />, label: i18n.t('MOVE_UP'), onClick: () => moveImageInGroup(group, key, 'up') },
          { key: 'down', icon: <DownOutlined />, label: i18n.t('MOVE_DOWN'), onClick: () => moveImageInGroup(group, key, 'down') },
          { key: 'bottom', icon: <VerticalAlignBottomOutlined />, label: i18n.t('MOVE_BOTTOM'), onClick: () => moveImageInGroup(group, key, 'bottom') },
        ]
        : []),
      ...(moveGroups.length > 0
        ? [
          { type: 'divider' as const },
          ...moveGroups.map((g) => ({
            key: `move-${g}`,
            label: `移动到「${g}」`,
            onClick: () => moveImageToGroup(key, g),
          })),
        ]
        : []),
    ]

    return (
      <Dropdown key={key} menu={{ items: menuItems }} trigger={['contextMenu']}>
        <div
          data-key={key}
          draggable={isNoneMode}
          onClick={(e) => handleItemClick(group, key, e)}
          onDragStart={(e) => handleDragStart(group, index, e)}
          onDragOver={isNoneMode ? handleDragOver : undefined}
          onDrop={isNoneMode ? (e) => handleDropOnItem(group, index, e) : undefined}
          onDragEnd={handleDragEnd}
          className={[
            'px-2 py-1 text-sm border-b border-gray-100 dark:border-gray-700',
            'flex items-center gap-2 cursor-pointer',
            isSelected
              ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700',
            dragIdx !== null && dragFromGroup === group && index === dragIdx ? 'opacity-50' : '',
          ].join(' ')}
        >
          {isNoneMode && (
            <span className="text-gray-400 text-xs w-4 shrink-0 text-right">{index + 1}</span>
          )}
          <span className="truncate flex-1 min-w-0" title={fileName}>
            {getFileNameFromPath(fileName)}
          </span>
          <span className="text-gray-400 text-xs shrink-0">
            {img.width}×{img.height}
          </span>
        </div>
      </Dropdown>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col p-4"
    >
      <Space orientation="vertical" className="w-full" size={6}>
        {/* 组选择器 */}
        <Space size={4} className="w-full">
          <Select
            value={activeGroup}
            onChange={setActiveGroup}
            style={{ width: 140 }}
            size="small"
            disabled
            options={groups.map((g) => ({ value: g, label: g }))}
          />
          <Button size="small" icon={<PlusOutlined />} onClick={openCreateModal} />
          <Button size="small" icon={<EditOutlined />} onClick={openEditModal} disabled={activeGroup === 'default'} />
        </Space>

        {/* 创建组弹窗 */}
        <Modal
          title={i18n.t('CREATE_GROUP')}
          open={createModalOpen}
          onOk={confirmCreateGroup}
          onCancel={() => setCreateModalOpen(false)}
          okText={i18n.t('OK')}
          cancelText={i18n.t('CANCEL')}
        >
          <Input
            value={createGroupName}
            onChange={(e) => setCreateGroupName(e.target.value)}
            onPressEnter={confirmCreateGroup}
            placeholder={i18n.t('GROUP_NAME_PLACEHOLDER')}
            autoFocus
          />
        </Modal>

        {/* 编辑组弹窗 */}
        <Modal
          title={i18n.t('EDIT_GROUP')}
          open={editModalOpen}
          onOk={confirmEditGroup}
          onCancel={() => setEditModalOpen(false)}
          okText={i18n.t('SAVE')}
          cancelText={i18n.t('CANCEL')}
          footer={(_, { OkBtn, CancelBtn }) => (
            <Space>
              <Button
                danger
                onClick={confirmDeleteFromEdit}
                disabled={activeGroup === 'default'}
              >
                {i18n.t('DELETE_GROUP')}
              </Button>
              <CancelBtn />
              <OkBtn />
            </Space>
          )}
        >
          <div className="space-y-3">
            <Input
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              onPressEnter={confirmEditGroup}
              placeholder={i18n.t('GROUP_NAME_PLACEHOLDER')}
              autoFocus
            />
            {groupCounts[activeGroup] > 0 && (
              <Text type="warning" className="block text-sm">
                {i18n.t('GROUP_HAS_IMAGES_WARNING', { 0: groupCounts[activeGroup] })}
              </Text>
            )}
          </div>
        </Modal>
        <Button icon={<FolderOpenOutlined />} size="small" block onClick={handleFolderClick}>
          {i18n.t('ADD_FOLDER')}
        </Button>
        {/* 上传按钮区 */}
        <Space size={4} className="w-full">
          <Upload
            multiple
            accept="image/png,image/jpg,image/jpeg,image/gif"
            showUploadList={false}
            beforeUpload={(file) => {
              processFiles([file]).then((imgs) => { addImages(imgs); return false })
              return false
            }}
          >
            <Button icon={<UploadOutlined />} size="small" block>
              {i18n.t('ADD_IMAGES')}
            </Button>
          </Upload>
          <Upload
            accept=".zip"
            showUploadList={false}
            beforeUpload={(file) => {
              processZipFile(file).then((imgs) => { addImages(imgs); return false })
              return false
            }}
          >
            <Button icon={<FolderOutlined />} size="small" block>
              {i18n.t('ADD_ZIP')}
            </Button>
          </Upload>
        </Space>

        {/* 操作按钮 */}
        <Space size={4}>
          <Button icon={<DeleteOutlined />} onClick={handleDelete} size="small" disabled={!totalImageCount}>
            {i18n.t('DELETE')}
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClear} size="small" disabled={!groupCounts[activeGroup]}>
            {i18n.t('CLEAR')}
          </Button>
          <Button danger icon={<ClearOutlined />} onClick={() => {
            Modal.confirm({
              title: i18n.t('CLEAR_ALL_TITLE'),
              content: i18n.t('CLEAR_ALL_CONFIRM'),
              okText: i18n.t('OK'),
              cancelText: i18n.t('CANCEL'),
              onOk: () => clearImages(),
            })
          }} size="small">
            {i18n.t('CLEAR_ALL')}
          </Button>
        </Space>
      </Space>

      <div
        className="flex-1 overflow-auto mt-2 rounded max-h-[70vh]"
      >
        <div onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}>
          <Text
            type="secondary" className="block text-center p-6"
            style={{ border: dragOver ? '2px dashed #1677ff' : "2px dashed #b0c2db" }}>
            {dragOver ? i18n.t('RELEASE_TO_IMPORT') : i18n.t('EMPTY_DRAG_HERE')}
          </Text>
        </div>
        <div className="select-none" ref={scrollWrapRef}>
          {groups.map((group) => {
            const keys = getGroupKeys(group)
            return (
              <div key={group}>
                {/* 组头 */}
                <Dropdown
                  trigger={['contextMenu']}
                  menu={{
                    items: [
                      {
                        key: 'top',
                        disabled: group === 'default' || groups.indexOf(group) === 0,
                        icon: <VerticalAlignTopOutlined />, label: i18n.t('MOVE_TOP'), onClick: () => moveGroupTop(group)
                      },
                      {
                        key: 'up',
                        icon: <UpOutlined />,
                        label: i18n.t('MOVE_UP'),
                        disabled: group === 'default' || groups.indexOf(group) === 0,
                        onClick: () => moveGroupUp(group),
                      },
                      {
                        key: 'down',
                        icon: <DownOutlined />,
                        label: i18n.t('MOVE_DOWN'),
                        disabled: group === 'default' || groups.indexOf(group) === groups.length - 1,
                        onClick: () => moveGroupDown(group),
                      },
                      {
                        key: 'bottom', icon: <VerticalAlignBottomOutlined />, disabled: group === 'default' || groups.indexOf(group) === groups.length - 1,
                        label: i18n.t('MOVE_BOTTOM'), onClick: () => moveGroupBottom(group)
                      },
                    ],
                  }}
                >
                  <div
                    className={[
                      'flex items-center gap-1 px-2 py-1.5 text-xs font-semibold',
                      'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',
                      'border-b border-gray-200 dark:border-gray-700 cursor-pointer',
                      'sticky top-0 z-10',
                    ].join(' ')}
                    onClick={() => { setActiveGroup(group); toggleGroupExpand(group) }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnGroupHeader(group, e)}
                  >
                    <span className="text-xs w-4">{expandedGroups[group] ? '▼' : '▶'}</span>
                    <span className="truncate">{group}</span>
                    <span className="ml-1 text-gray-400">({keys.length})</span>
                  </div>
                </Dropdown>
                {/* 组内图片列表 */}
                {expandedGroups[group] && keys.map((key, idx) => renderImageItem(group, key, idx))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
