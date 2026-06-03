/**
 * 打包结果预览面板
 * 支持选中高亮：点击 sprite 高亮，点击空白清除选中
 * None 模式支持右键菜单：上移/下移/置顶/置底
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography, Empty, Card, Dropdown } from 'antd'
import { usePackStore } from "@/app/store"
import type { PackResultItem, SpriteRect } from "@/app/types"

const { Text } = Typography

function hitTest(
  x: number,
  y: number,
  rects: SpriteRect[],
): SpriteRect | null {
  for (const item of rects) {
    let w = item.frame.w
    let h = item.frame.h
    if (item.rotated) {
      w = item.frame.h
      h = item.frame.w
    }
    if (x >= item.frame.x && x < item.frame.x + w &&
      y >= item.frame.y && y < item.frame.y + h) {
      return item
    }
  }
  return null
}

function selectCloned(rects: SpriteRect[], item: SpriteRect, toggleSelection: (path: string, ctrl: boolean) => void) {
  for (const r of rects) {
    if (r.cloned && r.file === item.file && r.originalFile) {
      toggleSelection(r.originalFile, true)
    }
  }
}

function SheetCanvas({ item }: { item: PackResultItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectedImages = usePackStore((s) => s.selectedImages)
  const toggleSelection = usePackStore((s) => s.toggleSelection)
  const clearSelection = usePackStore((s) => s.clearSelection)
  const packOptions = usePackStore((s) => s.packOptions)
  const moveImageInGroup = usePackStore((s) => s.moveImageInGroup)
  const { t } = useTranslation()
  const [ctxSprite, setCtxSprite] = useState<SpriteRect | null>(null)
  const isNoneMode = packOptions.packer === 'None'

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    img.onload = () => {
      canvas.width = item.width
      canvas.height = item.height
      ctx.drawImage(img, 0, 0)

      if (selectedImages.length) {
        ctx.globalAlpha = 0.35
        ctx.drawImage(img, 0, 0)
        ctx.globalAlpha = 1
      }

      for (const rect of item.data) {
        if (selectedImages.indexOf(rect.file) >= 0 ||
          (rect.originalFile && selectedImages.indexOf(rect.originalFile) >= 0)) {
          let w = rect.frame.w
          let h = rect.frame.h
          if (rect.rotated) {
            w = rect.frame.h
            h = rect.frame.w
          }

          ctx.clearRect(rect.frame.x, rect.frame.y, w, h)
          ctx.drawImage(img, rect.frame.x, rect.frame.y, w, h, rect.frame.x, rect.frame.y, w, h)

          ctx.beginPath()
          if (ctx.setLineDash) ctx.setLineDash([4, 2])
          ctx.strokeStyle = "#000"
          ctx.lineWidth = 1
          ctx.rect(rect.frame.x, rect.frame.y, w, h)
          ctx.stroke()
          if (ctx.setLineDash) ctx.setLineDash([])
        }
      }
    }
    img.src = item.imageData
  }, [item, selectedImages])

  useEffect(() => {
    draw()
  }, [draw])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const displayW = rect.width
    const displayH = rect.height
    const scaleX = canvas.width / displayW
    const scaleY = canvas.height / displayH
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const hit = hitTest(x, y, item.data)
    if (hit) {
      toggleSelection(hit.file, e.ctrlKey || e.shiftKey)
      selectCloned(item.data, hit, toggleSelection)
    } else {
      clearSelection()
    }
  }, [item.data, toggleSelection, clearSelection])

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isNoneMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const hit = hitTest(x, y, item.data)
    setCtxSprite(hit)
  }, [item.data, isNoneMode])

  const resetCtx = useCallback(() => setCtxSprite(null), [])

  const doMoveUp = useCallback(() => {
    if (ctxSprite) { moveImageInGroup(item.group || 'default', ctxSprite.file, 'up'); resetCtx() }
  }, [ctxSprite, moveImageInGroup, resetCtx, item.group])

  const doMoveDown = useCallback(() => {
    if (ctxSprite) { moveImageInGroup(item.group || 'default', ctxSprite.file, 'down'); resetCtx() }
  }, [ctxSprite, moveImageInGroup, resetCtx, item.group])

  const doMoveTop = useCallback(() => {
    if (ctxSprite) { moveImageInGroup(item.group || 'default', ctxSprite.file, 'top'); resetCtx() }
  }, [ctxSprite, moveImageInGroup, resetCtx, item.group])

  const doMoveBottom = useCallback(() => {
    if (ctxSprite) { moveImageInGroup(item.group || 'default', ctxSprite.file, 'bottom'); resetCtx() }
  }, [ctxSprite, moveImageInGroup, resetCtx, item.group])

  const contextMenuItems = isNoneMode ? [
    { key: 'up', label: t('MOVE_UP'), onClick: doMoveUp },
    { key: 'down', label: t('MOVE_DOWN'), onClick: doMoveDown },
    { type: 'divider' as const },
    { key: 'top', label: t('MOVE_TOP'), onClick: doMoveTop },
    { key: 'bottom', label: t('MOVE_BOTTOM'), onClick: doMoveBottom },
  ] : []

  return (
    <div className="overflow-auto">
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
        onOpenChange={(open) => { if (!open) resetCtx() }}
      >
        <canvas
          ref={canvasRef}
          className="border border-gray-300 dark:border-gray-600 cursor-pointer"
          style={{ imageRendering: "pixelated" }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      </Dropdown>
    </div>
  )
}

export function PackResultsPanel() {
  const { t } = useTranslation()
  const packResult = usePackStore((s) => s.packResult)

  if (!packResult?.length) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Empty description={t('PACK_RESULTS_EMPTY')} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Text strong className="text-base mb-3 block shrink-0">
        {t('PACK_RESULTS_TITLE', { 0: packResult.length })}
      </Text>
      <div className="flex-1 overflow-y-auto  overscroll-contain min-h-0"
        style={{
          maxHeight: "calc(100vh - 210px)"
        }}>
        {packResult.map((item, i) => {
          const groupLabel = item.group && item.group !== 'default' ? ` [${item.group}]` : ''
          return (
            <Card
              classNames={{ body: "overflow-y-auto" }}
              styles={{ body: { maxHeight: "calc(100vh - 210px )" } }}
              key={i}
              size="small"
              title={`${t('SHEET_TITLE', { 0: i + 1, 1: item.width, 2: item.height })}${groupLabel}`}
              className="mb-3"
            >
              <SheetCanvas item={item} />
            </Card>
          )
        })}
      </div>
    </div>
  )
}
