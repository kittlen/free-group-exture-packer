/**
 * 打包算法注册表
 * 所有打包算法通过 index 统一导出和查找
 */
import { MaxRectsBin } from './MaxRectsBin'
import { MaxRectsPacker } from './MaxRectsPacker'
import { OptimalPacker } from './OptimalPacker'
import { NonePacker } from './NonePacker'

/** 所有注册的打包算法类列表 */
export const packers = [NonePacker, MaxRectsBin, MaxRectsPacker, OptimalPacker]

/** 根据类型名称查找对应的打包算法类 */
export function getPackerByType(type: string) {
  return packers.find((p) => p.type === type) ?? null
}
