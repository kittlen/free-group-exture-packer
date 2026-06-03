/**
 * 打包工具函数
 * 图集渲染、多组拼接合并
 */
import type { PackOptions, PackResultItem, SpriteRect } from "@/app/types";
import { getFilterByType } from "@/features/filters"


/**
 * 将多组打包结果的首个 Sheet 拼接为一个图集
 * 多余的 Sheet 保留为独立结果
 * @param groupResults - 各组打包结果
 * @param direction - 拼接方向
 * @param textureFormat - 图片格式 png/jpg
 * @returns 合并后的结果列表
 */
export async function stitchAtlases(
    groupResults: { group: string; items: PackResultItem[] }[],
    direction: 'vertical' | 'horizontal',
    textureFormat: string,
): Promise<PackResultItem[]> {
    const firstSheets = groupResults.map((r) => r.items[0]).filter(Boolean)
    const extraSheets = groupResults.flatMap((r) => r.items.slice(1))
    if (firstSheets.length <= 1) return groupResults.flatMap((r) => r.items)

    const mimeType = textureFormat === 'jpg' ? 'image/jpeg' : 'image/png'

    // 异步加载所有渲染后的图片
    const imgs = await Promise.all(
        firstSheets.map((sheet) => {
            const img = new Image()
            img.src = sheet.imageData
            return img.decode().then(() => img)
        }),
    )

    if (direction === 'vertical') {
        const totalWidth = Math.max(...firstSheets.map((s) => s.width))
        const totalHeight = firstSheets.reduce((sum, s) => sum + s.height, 0)
        const canvas = document.createElement('canvas')
        canvas.width = totalWidth
        canvas.height = totalHeight
        const ctx = canvas.getContext('2d')!

        if (textureFormat === 'jpg') {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, totalWidth, totalHeight)
        }

        let y = 0
        const allData: SpriteRect[] = []
        for (let i = 0; i < firstSheets.length; i++) {
            ctx.drawImage(imgs[i], 0, y)
            for (const rect of firstSheets[i].data) {
                allData.push({ ...rect, frame: { x: rect.frame.x, y: rect.frame.y + y, w: rect.frame.w, h: rect.frame.h } })
            }
            y += firstSheets[i].height
        }
        const imageData = canvas.toDataURL(mimeType)
        return [{ group: 'merged', data: allData, imageData, width: totalWidth, height: totalHeight }, ...extraSheets]
    }

    const totalWidth = firstSheets.reduce((sum, s) => sum + s.width, 0)
    const totalHeight = Math.max(...firstSheets.map((s) => s.height))
    const canvas = document.createElement('canvas')
    canvas.width = totalWidth
    canvas.height = totalHeight
    const ctx = canvas.getContext('2d')!

    if (textureFormat === 'jpg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, totalWidth, totalHeight)
    }

    let x = 0
    const allData: SpriteRect[] = []
    for (let i = 0; i < firstSheets.length; i++) {
        ctx.drawImage(imgs[i], x, 0)
        for (const rect of firstSheets[i].data) {
            allData.push({ ...rect, frame: { x: rect.frame.x + x, y: rect.frame.y, w: rect.frame.w, h: rect.frame.h } })
        }
        x += firstSheets[i].width
    }
    const imageData = canvas.toDataURL(mimeType)
    return [{ group: 'merged', data: allData, imageData, width: totalWidth, height: totalHeight }, ...extraSheets]
}


/**
 * 将打包结果渲染为一张图集图片
 * 处理旋转、裁剪、滤镜、jpg 白色背景
 * @param _imageData - 未使用的旧参数
 * @param rects - Sprite 列表
 * @param width - 图集宽度
 * @param height - 图集高度
 * @param options - 打包参数
 * @returns 渲染后的 data URL
 */
export function renderPackedTexture(
    _imageData: string,
    rects: SpriteRect[],
    width: number,
    height: number,
    options: PackOptions,
): string {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")!

    if (options.textureFormat === "jpg") {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)
    }

    for (const rect of rects) {
        const img = rect.image.img
        if (!img || rect.skipRender) continue

        if (rect.rotated) {
            ctx.save()
            ctx.translate(rect.frame.x + rect.frame.h, rect.frame.y)
            ctx.rotate(Math.PI / 2)
            ctx.drawImage(
                img,
                rect.spriteSourceSize.x, rect.spriteSourceSize.y,
                rect.spriteSourceSize.w, rect.spriteSourceSize.h,
                0, 0,
                rect.frame.w, rect.frame.h,
            )
            ctx.restore()
        } else {
            ctx.drawImage(
                img,
                rect.spriteSourceSize.x, rect.spriteSourceSize.y,
                rect.spriteSourceSize.w, rect.spriteSourceSize.h,
                rect.frame.x, rect.frame.y,
                rect.frame.w, rect.frame.h,
            )
        }
    }

    const filter = getFilterByType(options.filter)
    if (filter.type !== "Original") {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const filtered = filter.apply(imageData)
        ctx.putImageData(filtered, 0, 0)
    }

    return canvas.toDataURL(options.textureFormat === "png" ? "image/png" : "image/jpeg")
}