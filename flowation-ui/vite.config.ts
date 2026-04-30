import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Install to enable: npm install -D rollup-plugin-visualizer
// Then run: npm run build — opens stats.html with bundle breakdown
let visualizer: ReturnType<typeof import('rollup-plugin-visualizer').visualizer> | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { visualizer: v } = require('rollup-plugin-visualizer')
  if (process.env.ANALYZE) visualizer = v({ open: true, filename: 'stats.html' })
} catch {
  // package not installed — silently skip
}

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    ...(visualizer ? [visualizer] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 2122,
    proxy: {
      '/api': {
        target: 'http://localhost:2121',
        changeOrigin: true,
      },
    },
  },
})
