import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, readdirSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { createAssetsHandler } from './server/assets.ts'

function localDownloadsPlugin(localPath: string, apiKey: string): Plugin {
  const assetsHandler = createAssetsHandler(localPath, apiKey)
  return {
    name: 'local-downloads',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== '/api/config') return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET, HEAD')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ hasSteamGridKey: Boolean(apiKey.trim()) }))
      })
      server.middlewares.use('/api/game-assets', (req, res) => {
        void assetsHandler(req, res)
      })
      server.middlewares.use('/games/', (req, res) => {
        try {
          const root = realpathSync(resolve(localPath))
          const pathname = decodeURIComponent((req.url ?? '/').split('?')[0])
          const dir = realpathSync(resolve(root, '.' + pathname))
          const rel = relative(root, dir)
          if (rel.startsWith('..') || isAbsolute(rel)) {
            res.statusCode = 403
            res.end()
            return
          }
          if (statSync(dir).isFile()) {
            const isAsset = /[/\\]assets[/\\](cover|banner|logo)\.png$/.test(dir)
            res.setHeader('Content-Type', isAsset ? 'image/png' : 'application/octet-stream')
            if (isAsset) res.setHeader('Cache-Control', 'no-cache')
            if (!isAsset) res.setHeader('Content-Disposition', 'attachment')
            const stream = createReadStream(dir)
            stream.on('error', () => res.destroy())
            stream.pipe(res)
            return
          }
          const entries = readdirSync(dir).map(name => {
            const s = statSync(join(dir, name))
            return {
              name,
              type: s.isDirectory() ? 'directory' : 'file',
              mtime: s.mtime.toISOString(),
              ...(s.isFile() ? { size: s.size } : {}),
            }
          })
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(entries))
        } catch (error) {
          res.statusCode = error instanceof URIError ? 400 : 404
          res.end()
        }
      })
    },
  }
}

export default defineConfig(() => {
  const downloadsPath = process.env.games_path || resolve('games')

  return {
    envDir: false as const,
    plugins: [
      react(),
      localDownloadsPlugin(downloadsPath, process.env.steamgrid_key || ''),
    ],
  }
})
