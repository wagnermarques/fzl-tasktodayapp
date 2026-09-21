import { defineConfig, mergeConfig } from 'vite'
import { appshellConfig } from './fzl-fund-appshell--lit/vite/preset.js'

export default defineConfig(
  mergeConfig(
    appshellConfig({
      base: './',
      storagePrefix: 'fzl-tasktodayapp',
      manifest: {
        name: 'Task Today App — Gestão de Tarefas e Deadlines',
        short_name: 'Task Today',
        description: 'Gerenciador de tarefas com foco em deadlines, alarmes sonoros e notificações push multiplataforma',
        background_color: '#fffbfe',
        theme_color: '#6750a4',
        icons: [
          { src: 'icons/icon-48.png', sizes: '48x48', type: 'image/png' },
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
    {
      server: {
        port: 3030,
      },
    },
  ),
)
