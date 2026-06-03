/// <reference types="vite/client" />

/**
 * Vite ?raw 导入的 .mst 模板文件类型声明
 * 允许 TypeScript 识别 `import template from '*.mst?raw'` 语法
 */
declare module '*.mst?raw' {
  const content: string
  export default content
}
