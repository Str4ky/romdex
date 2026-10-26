import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { readdir, realpath, stat } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createAssetsHandler } from './assets.ts';

interface AppOptions {
    gamesPath: string;
    distPath: string;
    apiKey?: string;
}

function httpError(status: number) {
    return Object.assign(new Error(`HTTP ${status}`), { status });
}

export function createApp({ gamesPath, distPath, apiKey = '' }: AppOptions) {
    const app = express();
    const frontend = resolve(distPath);
    app.disable('x-powered-by');
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
    });

    const assets = createAssetsHandler(gamesPath, apiKey);
    app.use('/api/game-assets', (req, res) => assets(req, res));
    app.get('/api/config', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json({ hasSteamGridKey: Boolean(apiKey.trim()) });
    });
    app.use('/api', (_req, res) => { res.status(404).json({ error: 'Not found' }); });

    app.use('/games', async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.setHeader('Allow', 'GET, HEAD');
            throw httpError(405);
        }
        let pathname: string;
        try {
            pathname = decodeURIComponent(req.url.split('?')[0]);
        } catch {
            throw httpError(400);
        }
        const parts = pathname.split('/').filter(Boolean);
        if (parts.some(part => part.startsWith('.') || part.includes('\\') ||
            (process.platform === 'win32' && part.includes(':')) ||
            [...part].some(char => char.charCodeAt(0) < 32))) {
            throw httpError(403);
        }
        const root = await realpath(resolve(gamesPath));
        const path = await realpath(join(root, ...parts));
        const rel = relative(root, path);
        if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw httpError(403);
        const info = await stat(path);
        res.setHeader('Cache-Control', 'no-cache');
        if (info.isDirectory()) {
            const entries = await readdir(path, { withFileTypes: true });
            const listing = await Promise.all(entries.filter(entry => !entry.name.startsWith('.')).map(async entry => {
                const entryPath = await realpath(join(path, entry.name));
                const entryRel = relative(root, entryPath);
                if (isAbsolute(entryRel) || entryRel === '..' || entryRel.startsWith(`..${sep}`)) return null;
                const metadata = await stat(entryPath);
                if (!metadata.isDirectory() && !metadata.isFile()) return null;
                return {
                    name: entry.name,
                    type: metadata.isDirectory() ? 'directory' : 'file',
                    mtime: metadata.mtime.toISOString(),
                    ...(metadata.isFile() ? { size: metadata.size } : {}),
                };
            }));
            res.json(listing.filter(Boolean));
            return;
        }
        if (!info.isFile()) throw httpError(404);
        const isAsset = parts.at(-2) === 'assets' && /^(cover|banner|logo)\.png$/.test(parts.at(-1) ?? '');
        if (isAsset) {
            res.type('png');
            res.sendFile(path, { dotfiles: 'deny' });
        } else {
            res.type('application/octet-stream');
            res.download(path, basename(path), { dotfiles: 'deny' });
        }
    });

    app.use(express.static(frontend, { dotfiles: 'deny', index: false, redirect: false }));
    app.use('/assets', (_req, res) => { res.sendStatus(404); });
    app.use((req, res) => {
        if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
            res.setHeader('Cache-Control', 'no-cache');
            res.sendFile(join(frontend, 'index.html'));
        } else {
            res.sendStatus(404);
        }
    });

    const handleError: ErrorRequestHandler = (error, _req, res, next) => {
        if (res.headersSent) { next(error); return; }
        const status = error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : (error.status || 500);
        if (status >= 500) console.error('HTTP server:', error);
        res.status(status).json({ error: status >= 500 ? 'Server error' : `HTTP ${status}` });
    };
    app.use(handleError);
    return app;
}