import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'electron' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 核心
          if (id.includes('node_modules/react')) return 'vendor-react'
          // antd 组件库
          if (id.includes('node_modules/antd')) return 'vendor-antd'
          // 国际化 i18n
          if (id.includes('node_modules/i18next')) return 'vendor-i18n'
          // 工具库 lodash / file-saver / jszip
          if (id.includes('node_modules/lodash')) return 'vendor-utils'
          if (id.includes('node_modules/file-saver')) return 'vendor-utils'
          if (id.includes('node_modules/jszip')) return 'vendor-utils'
          // 纹理打包核心
          if (id.includes('node_modules/maxrects-packer')) return 'vendor-packer'
          // 状态管理 zustand
          if (id.includes('node_modules/zustand')) return 'vendor-store'
          // 其他第三方依赖
          if (id.includes('node_modules')) return 'vendor-other'
        },
      },
    },
  },
}))