/**
 * 智能排序函数
 * 移植自旧版 free-tex-packer/src/client/utils/common.js
 * 同文件夹内按自然数排序（img2 < img10），不同文件夹按字符串比较
 */
export function smartSortImages(f1: string, f2: string): number {
  const t1 = f1.split('/')
  const t2 = f2.split('/')

  const n1 = t1.pop()!
  const n2 = t2.pop()!

  const p1 = t1.join('/')
  const p2 = t2.join('/')

  if (p1 === p2) {
    const st1 = n1.split('.')
    const st2 = n2.split('.')

    if (st1.length > 1) st1.pop()
    if (st2.length > 1) st2.pop()

    const num1 = parseInt(st1.join('.'), 10)
    const num2 = parseInt(st2.join('.'), 10)

    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 === num2) return 0
      return num1 > num2 ? 1 : -1
    }
  }

  if (f1 === f2) return 0
  return f1 > f2 ? 1 : -1
}
