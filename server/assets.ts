import { randomUUID } from 'node:crypto';
import { mkdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isAbsolute, join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const fields = ['cover', 'banner', 'logo'] as const;
type Field = typeof fields[number];
type Assets = Record<Field, string | null>;
type Image = { url: string; lock: boolean; width?: number; height?: number };
const apiBase = 'https://www.steamgriddb.com/api/v2';
const maxImagePixels = 40_000_000;

export class AssetError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

function isWithin(root: string, path: string) {
    const rel = relative(root, path);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

async function exists(path: string) {
    try {
        return (await stat(path)).isFile();
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw error;
    }
}

export function createAssetStore(gamesPath: string, apiKey: string, request = fetch) {
    const inflight = new Map<string, Promise<Assets>>();

    async function api<T>(path: string): Promise<T[]> {
        const response = await request(`${apiBase}/${path}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(30_000),
            redirect: 'error',
        });
        if (!response.ok) throw new AssetError(502, `SteamGridDB: HTTP ${response.status}`);
        const json = await response.json() as { success: boolean; data: T[] };
        if (!json.success || !Array.isArray(json.data)) throw new AssetError(502, 'Invalid SteamGridDB response');
        return json.data;
    }

    async function download(url: string) {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || !/^cdn\d*\.steamgriddb\.com$/.test(parsed.hostname)) {
            throw new AssetError(502, 'Invalid SteamGridDB artwork source');
        }
        const response = await request(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
        if (!response.ok || !response.body) throw new AssetError(502, 'Unable to download artwork');
        const chunks: Uint8Array[] = [];
        let size = 0;
        for await (const chunk of response.body) {
            size += chunk.length;
            if (size > 20 * 1024 * 1024) throw new AssetError(502, 'Artwork exceeds the size limit');
            chunks.push(chunk);
        }
        return sharp(Buffer.concat(chunks), { limitInputPixels: maxImagePixels }).png().toBuffer();
    }

    async function locate(consoleName: string, gameName: string) {
        for (const segment of [consoleName, gameName]) {
            if (!segment || segment === '.' || segment === '..' || /[/\\]/.test(segment) || [...segment].some(char => char.charCodeAt(0) < 32)) {
                throw new AssetError(400, 'Invalid game path');
            }
        }
        const root = await realpath(resolve(gamesPath));
        let gamePath: string;
        try {
            gamePath = await realpath(join(root, consoleName, gameName));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new AssetError(404, 'Game not found');
            throw error;
        }
        if (!isWithin(root, gamePath) || !(await stat(gamePath)).isDirectory()) {
            throw new AssetError(400, 'Invalid game path');
        }
        const assetsPath = join(gamePath, 'assets');
        try {
            if (!isWithin(gamePath, await realpath(assetsPath))) throw new AssetError(400, 'Invalid assets directory');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        const base = `/games/${encodeURIComponent(consoleName)}/${encodeURIComponent(gameName)}/assets`;
        async function localAssets(): Promise<Assets> {
            const result: Assets = { cover: null, banner: null, logo: null };
            for (const field of fields) {
                if (await exists(join(assetsPath, `${field}.png`))) result[field] = `${base}/${field}.png`;
            }
            return result;
        }
        return { assetsPath, base, localAssets };
    }

    async function ensure(consoleName: string, gameName: string): Promise<Assets> {
        const { assetsPath, localAssets } = await locate(consoleName, gameName);
        const existing = await localAssets();
        if (Object.values(existing).some(Boolean)) return existing;
        if (!apiKey) throw new AssetError(503, 'SteamGridDB API key not configured');

        const games = await api<{ id: number; name: string }>(`search/autocomplete/${encodeURIComponent(gameName)}`);
        const game = games.find(item => item.name.toLowerCase() === gameName.toLowerCase()) ?? games[0];
        if (!game) return existing;

        const endpoints: Record<Field, string> = { cover: 'grids', banner: 'heroes', logo: 'logos' };
        const results = await Promise.allSettled(fields.map(async field => {
            const images = await api<Image>(`${endpoints[field]}/game/${game.id}`);
            const candidates = images.filter(item =>
                !item.lock &&
                (field !== 'cover' || (item.width === 600 && item.height === 900)) &&
                (item.width === undefined || item.height === undefined || item.width * item.height <= maxImagePixels)
            );
            let lastError: unknown;
            for (const image of candidates) {
                try {
                    return { field, buffer: await download(image.url) };
                } catch (error) {
                    lastError = error;
                }
            }
            if (lastError) throw lastError;
            return { field, buffer: null };
        }));
        if (results.some(result => result.status === 'rejected')) {
            throw new AssetError(502, 'Unable to fetch artwork; try again later');
        }
        const images = results.flatMap(result => result.status === 'fulfilled' && result.value.buffer ? [result.value] : []);
        if (images.length) await mkdir(assetsPath, { recursive: true });
        const staged: { temp: string; target: string }[] = [];
        const published: string[] = [];
        try {
            for (const { field, buffer } of images) {
                const temp = join(assetsPath, `.${field}-${randomUUID()}.tmp`);
                staged.push({ temp, target: join(assetsPath, `${field}.png`) });
                await writeFile(temp, buffer!, { flag: 'wx' });
            }
            for (const { temp, target } of staged) {
                await rename(temp, target);
                published.push(target);
            }
        } catch (error) {
            await Promise.all(published.map(path => rm(path, { force: true })));
            throw error;
        } finally {
            await Promise.all(staged.map(({ temp }) => rm(temp, { force: true })));
        }
        return localAssets();
    }

    return {
        async replace(consoleName: string, gameName: string, field: string, input: Buffer) {
            if (!fields.includes(field as Field)) throw new AssetError(400, 'Invalid artwork type');
            if (!input.length) throw new AssetError(400, 'Empty image');
            if (input.length > 20 * 1024 * 1024) throw new AssetError(413, 'Image limited to 20 MB');
            await inflight.get(JSON.stringify([consoleName, gameName]))?.catch(() => {});
            const { assetsPath, base } = await locate(consoleName, gameName);
            let png: Buffer;
            try {
                const image = sharp(input, { limitInputPixels: maxImagePixels });
                const metadata = await image.metadata();
                if (!['png', 'jpeg', 'webp', 'gif', 'avif'].includes(metadata.format ?? '')) {
                    throw new Error('Unsupported format');
                }
                png = await image.rotate().png().toBuffer();
            } catch {
                throw new AssetError(400, 'Invalid image format');
            }
            await mkdir(assetsPath, { recursive: true });
            const temp = join(assetsPath, `.${field}-${randomUUID()}.tmp`);
            try {
                await writeFile(temp, png, { flag: 'wx' });
                await rename(temp, join(assetsPath, `${field}.png`));
            } finally {
                await rm(temp, { force: true });
            }
            return { field, url: `${base}/${field}.png?v=${randomUUID()}` };
        },
        ensure(consoleName: string, gameName: string) {
            const key = JSON.stringify([consoleName, gameName]);
            const pending = inflight.get(key);
            if (pending) return pending;
            const promise = ensure(consoleName, gameName).finally(() => inflight.delete(key));
            inflight.set(key, promise);
            return promise;
        },
    };
}

export function createAssetsHandler(gamesPath: string, apiKey: string) {
    const store = createAssetStore(gamesPath, apiKey);
    return async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        try {
            if (req.method !== 'POST' && req.method !== 'PUT') {
                res.setHeader('Allow', 'POST, PUT');
                throw new AssetError(405, 'Unauthorized method');
            }
            const parts = (req.url ?? '').split('?')[0].split('/');
            if (parts.length !== (req.method === 'PUT' ? 4 : 3) || parts[0] !== '') throw new AssetError(400, 'Invalid game path');
            let consoleName: string;
            let gameName: string;
            try {
                [consoleName, gameName] = parts.slice(1).map(decodeURIComponent);
            } catch {
                throw new AssetError(400, 'Invalid path encoding');
            }
            if (req.method === 'PUT') {
                const origin = req.headers.origin;
                if (origin && new URL(origin).host !== req.headers.host) throw new AssetError(403, 'Unauthorized origin');
                if (!fields.includes(parts[3] as Field)) throw new AssetError(400, 'Invalid asset type');
                if (Number(req.headers['content-length']) > 20 * 1024 * 1024) throw new AssetError(413, 'Image limited to 20 MB');
                const chunks: Buffer[] = [];
                let size = 0;
                for await (const chunk of req) {
                    size += chunk.length;
                    if (size > 20 * 1024 * 1024) throw new AssetError(413, 'Image limited to 20 MB');
                    chunks.push(Buffer.from(chunk));
                }
                res.end(JSON.stringify(await store.replace(consoleName, gameName, parts[3], Buffer.concat(chunks))));
            } else {
                res.end(JSON.stringify(await store.ensure(consoleName, gameName)));
            }
        } catch (error) {
            res.statusCode = error instanceof AssetError ? error.status : 500;
            if (!(error instanceof AssetError)) console.error('Game assets:', error);
            res.end(JSON.stringify({ error: error instanceof AssetError ? error.message : 'Unable to prepare game assets' }));
        }
    };
}