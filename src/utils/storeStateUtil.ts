import type { BaseRawImage, RawImage } from "@/app/types";

/** 将包含运行时对象（img, canvas, ctx）的 RawImage 转为纯数据 BaseRawImage */
export const toBaseRawImage = (rawImages: Record<string, RawImage>): Record<string, BaseRawImage> => {
    const result: Record<string, BaseRawImage> = {};
    for (const [key, r] of Object.entries(rawImages)) {
        result[key] = {
            name: r.name,
            file: r.file,
            width: r.width,
            height: r.height,
            _base64: r._base64,
        }
    }
    return result;
}