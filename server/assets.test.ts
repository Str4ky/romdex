import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import sharp from 'sharp';
import { AssetError, createAssetStore } from './assets.ts';

async function fixture(t: TestContext) {
    const root = await mkdtemp(join(tmpdir(), 'romdex-assets-'));
    const game = join(root, 'Nintendo DS', 'Jeu été #1');
    await mkdir(game, { recursive: true });
    t.after(() => rm(root, { recursive: true, force: true }));
    return { root, game, assets: join(game, 'assets') };
}

async function mockSteamGrid() {
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } }).jpeg().toBuffer();
    const calls: string[] = [];
    const request: typeof fetch = async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.includes('search/autocomplete')) return Response.json({ success: true, data: [{ id: 123, name: 'Jeu été #1' }] });
        if (url.startsWith('https://cdn2.steamgriddb.com/')) return new Response(new Uint8Array(jpeg));
        const field = url.includes('/grids/') ? 'cover' : url.includes('/heroes/') ? 'banner' : 'logo';
        return Response.json({ success: true, data: [{ url: `https://cdn2.steamgriddb.com/${field}.jpg`, lock: false, width: 600, height: 900 }] });
    };
    return { request, calls };
}

test('local upload: converts to PNG, replaces only the selected artwork and preserves other files', async t => {
    const { root, assets } = await fixture(t);
    await mkdir(assets);
    await writeFile(join(assets, 'banner.png'), 'original banner');
    await writeFile(join(assets, 'cover.png'), 'old cover');
    const input = await sharp({ create: { width: 3, height: 2, channels: 3, background: '#ff1234' } }).jpeg().toBuffer();
    const store = createAssetStore(root, '', async () => { throw new Error('Unexpected network request'); });
    const result = await store.replace('Nintendo DS', 'Jeu été #1', 'cover', input);
    assert.match(result.url, /\/assets\/cover\.png\?v=/);
    assert.equal(result.field, 'cover');
    assert.equal((await sharp(await readFile(join(assets, 'cover.png'))).metadata()).format, 'png');
    assert.equal(await readFile(join(assets, 'banner.png'), 'utf8'), 'original banner');
    assert.deepEqual(await readdir(assets), ['banner.png', 'cover.png']);
    const second = await store.replace('Nintendo DS', 'Jeu été #1', 'cover', input);
    assert.notEqual(second.url, result.url);
});

test('invalid upload: preserves the existing file and rejects invalid paths, types and sizes', async t => {
    const { root, assets } = await fixture(t);
    await mkdir(assets);
    await writeFile(join(assets, 'logo.png'), 'original');
    const store = createAssetStore(root, '');
    await assert.rejects(store.replace('Nintendo DS', 'Jeu été #1', 'logo', Buffer.from('not an image')), { status: 400 });
    assert.equal(await readFile(join(assets, 'logo.png'), 'utf8'), 'original');
    await assert.rejects(store.replace('Nintendo DS', 'Jeu été #1', '../secret', Buffer.from('test')), { status: 400 });
    await assert.rejects(store.replace('Nintendo DS', '../secret', 'logo', Buffer.from('test')), { status: 400 });
    await assert.rejects(store.replace('Nintendo DS', 'Jeu été #1', 'logo', Buffer.alloc(0)), { status: 400 });
    await assert.rejects(store.replace('Nintendo DS', 'Jeu été #1', 'logo', Buffer.alloc(20 * 1024 * 1024 + 1)), { status: 413 });
});

test('upload to a game without assets: works without a SteamGridDB key', async t => {
    const { root, assets } = await fixture(t);
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#ff000080' } }).png().toBuffer();
    await createAssetStore(root, '').replace('Nintendo DS', 'Jeu été #1', 'logo', png);
    assert.deepEqual(await readdir(assets), ['logo.png']);
});

test('empty directory: downloads all artwork and writes local PNG files', async t => {
    const { root, assets } = await fixture(t);
    const { request, calls } = await mockSteamGrid();
    const result = await createAssetStore(root, 'test-key', request).ensure('Nintendo DS', 'Jeu été #1');
    assert.deepEqual(await readdir(assets), ['banner.png', 'cover.png', 'logo.png']);
    assert.equal(calls.length, 7);
    for (const field of ['cover', 'banner', 'logo'] as const) {
        assert.equal(result[field], `/games/Nintendo%20DS/Jeu%20%C3%A9t%C3%A9%20%231/assets/${field}.png`);
        const metadata = await sharp(await readFile(join(assets, `${field}.png`))).metadata();
        assert.equal(metadata.format, 'png');
    }
});

test('oversized logo: uses the next candidate without blocking other artwork', async t => {
    const { root, assets } = await fixture(t);
    const { request, calls } = await mockSteamGrid();
    const store = createAssetStore(root, 'test-key', async (input, init) => {
        if (String(input).includes('/logos/')) return Response.json({ success: true, data: [
            { url: 'https://cdn2.steamgriddb.com/oversized.png', lock: false, width: 9634, height: 4834 },
            { url: 'https://cdn2.steamgriddb.com/logo.jpg', lock: false, width: 1898, height: 917 },
        ] });
        return request(input, init);
    });
    const result = await store.ensure('Nintendo DS', 'Jeu été #1');
    assert.ok(result.cover && result.banner && result.logo);
    assert.deepEqual(await readdir(assets), ['banner.png', 'cover.png', 'logo.png']);
    assert.equal(calls.includes('https://cdn2.steamgriddb.com/oversized.png'), false);
    assert.ok(calls.includes('https://cdn2.steamgriddb.com/logo.jpg'));
});

test('banner exceeds 20 MB: uses the next candidate and publishes all artwork', async t => {
    const { root, assets } = await fixture(t);
    const { request, calls } = await mockSteamGrid();
    let oversizedRequests = 0;
    const store = createAssetStore(root, 'test-key', async (input, init) => {
        if (String(input).includes('/heroes/')) return Response.json({ success: true, data: [
            { url: 'https://cdn2.steamgriddb.com/oversized.png', lock: false, width: 3840, height: 1240 },
            { url: 'https://cdn2.steamgriddb.com/banner.jpg', lock: false, width: 1600, height: 650 },
        ] });
        if (String(input).endsWith('/oversized.png')) {
            oversizedRequests++;
            return new Response(new Uint8Array(20 * 1024 * 1024 + 1));
        }
        return request(input, init);
    });
    const result = await store.ensure('Nintendo DS', 'Jeu été #1');
    assert.ok(result.cover && result.banner && result.logo);
    assert.equal(oversizedRequests, 1);
    assert.ok(calls.includes('https://cdn2.steamgriddb.com/banner.jpg'));
    assert.deepEqual(await readdir(assets), ['banner.png', 'cover.png', 'logo.png']);
});

test('invalid first artwork: tries the next candidate', async t => {
    const { root } = await fixture(t);
    const { request } = await mockSteamGrid();
    const store = createAssetStore(root, 'test-key', async (input, init) => {
        if (String(input).includes('/logos/')) return Response.json({ success: true, data: [
            { url: 'https://cdn2.steamgriddb.com/broken.png', lock: false },
            { url: 'https://cdn2.steamgriddb.com/logo.jpg', lock: false },
        ] });
        if (String(input).endsWith('/broken.png')) return new Response('not an image');
        return request(input, init);
    });
    assert.ok((await store.ensure('Nintendo DS', 'Jeu été #1')).logo);
});

for (const field of ['cover', 'banner', 'logo']) {
    test(`only ${field}.png exists: no remote requests or replacements`, async t => {
        const { root, assets } = await fixture(t);
        await mkdir(assets);
        await writeFile(join(assets, `${field}.png`), 'original');
        let requests = 0;
        const store = createAssetStore(root, '', async () => { requests++; throw new Error('Unexpected network request'); });
        const result = await store.ensure('Nintendo DS', 'Jeu été #1');
        assert.equal(requests, 0);
        assert.equal(Object.values(result).filter(Boolean).length, 1);
        assert.equal(await readFile(join(assets, `${field}.png`), 'utf8'), 'original');
        assert.equal((await readdir(assets)).length, 1);
    });
}

test('new server instance: disk cache works without an API key', async t => {
    const { root } = await fixture(t);
    const { request } = await mockSteamGrid();
    const first = await createAssetStore(root, 'test-key', request).ensure('Nintendo DS', 'Jeu été #1');
    const second = await createAssetStore(root, '', async () => { throw new Error('Unexpected network request'); }).ensure('Nintendo DS', 'Jeu été #1');
    assert.deepEqual(second, first);
});

test('concurrent requests: downloads each artwork only once', async t => {
    const { root } = await fixture(t);
    const { request, calls } = await mockSteamGrid();
    const store = createAssetStore(root, 'test-key', request);
    const results = await Promise.all(Array.from({ length: 8 }, () => store.ensure('Nintendo DS', 'Jeu été #1')));
    assert.equal(calls.length, 7);
    results.forEach(result => assert.deepEqual(result, results[0]));
});

test('temporary failure: publishes no files and allows retries', async t => {
    const { root, assets } = await fixture(t);
    const { request } = await mockSteamGrid();
    let fail = true;
    const store = createAssetStore(root, 'test-key', async (input, init) => {
        if (fail && String(input).includes('/heroes/')) return new Response(null, { status: 503 });
        return request(input, init);
    });
    await assert.rejects(store.ensure('Nintendo DS', 'Jeu été #1'), { status: 502 });
    await assert.rejects(readdir(assets), { code: 'ENOENT' });
    fail = false;
    assert.ok((await store.ensure('Nintendo DS', 'Jeu été #1')).banner);
});

test('unavailable artwork: remains absent while other images are saved', async t => {
    const { root, assets } = await fixture(t);
    const { request } = await mockSteamGrid();
    const store = createAssetStore(root, 'test-key', async (input, init) => {
        if (String(input).includes('/logos/')) return Response.json({ success: true, data: [] });
        return request(input, init);
    });
    const result = await store.ensure('Nintendo DS', 'Jeu été #1');
    assert.equal(result.logo, null);
    assert.deepEqual(await readdir(assets), ['banner.png', 'cover.png']);
});

test('no SteamGridDB results: creates no directory', async t => {
    const { root, assets } = await fixture(t);
    const store = createAssetStore(root, 'test-key', async () => Response.json({ success: true, data: [] }));
    assert.deepEqual(await store.ensure('Nintendo DS', 'Jeu été #1'), { cover: null, banner: null, logo: null });
    await assert.rejects(readdir(assets), { code: 'ENOENT' });
});

test('invalid paths and missing games: rejected without network requests', async t => {
    const { root } = await fixture(t);
    const store = createAssetStore(root, 'test-key', async () => { throw new Error('Unexpected network request'); });
    for (const name of ['..', '../secret', 'a\\b', 'bad\0name']) {
        await assert.rejects(store.ensure('Nintendo DS', name), error => error instanceof AssetError && error.status === 400);
    }
    await assert.rejects(store.ensure('Nintendo DS', 'Absent'), { status: 404 });
});

test('no API key and no artwork: returns an explicit error', async t => {
    const { root } = await fixture(t);
    await assert.rejects(createAssetStore(root, '').ensure('Nintendo DS', 'Jeu été #1'), { status: 503 });
});

test('publication failure: rolls back written files without deleting unrelated assets', async t => {
    const { root, assets } = await fixture(t);
    const { request } = await mockSteamGrid();
    await mkdir(join(assets, 'banner.png'), { recursive: true });
    await writeFile(join(assets, 'custom.txt'), 'keep');
    await assert.rejects(createAssetStore(root, 'test-key', request).ensure('Nintendo DS', 'Jeu été #1'));
    assert.deepEqual(await readdir(assets), ['banner.png', 'custom.txt']);
});

test('Vite: local API, JSON listings, displayable PNGs and downloadable ROMs', async t => {
    const { root, game, assets } = await fixture(t);
    await mkdir(assets);
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } }).png().toBuffer();
    await writeFile(join(assets, 'cover.png'), png);
    await mkdir(join(game, 'game'));
    await writeFile(join(game, 'game', 'jeu.nds'), 'rom-test');

    const previous = process.env.games_path;
    process.env.games_path = root;
    const { createServer } = await import('vite');
    const server = await createServer({ server: { host: '127.0.0.1', port: 0, watch: null }, logLevel: 'silent' });
    t.after(async () => {
        await server.close();
        if (previous === undefined) delete process.env.games_path;
        else process.env.games_path = previous;
    });
    await server.listen();
    const address = server.httpServer!.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const config = await fetch(`${base}/api/config`);
    assert.equal(config.status, 200);
    assert.equal(config.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await config.json(), { hasSteamGridKey: Boolean((process.env.steamgrid_key ?? '').trim()) });
    assert.equal((await fetch(`${base}/api/config`, { method: 'POST' })).status, 405);
    const path = '/Nintendo%20DS/Jeu%20%C3%A9t%C3%A9%20%231';
    const prepared = await fetch(`${base}/api/game-assets${path}`, { method: 'POST' });
    assert.equal(prepared.status, 200);
    const result = await prepared.json() as { cover: string };
    const cover = await fetch(`${base}${result.cover}`);
    assert.equal(cover.headers.get('content-type'), 'image/png');
    assert.equal(cover.headers.get('content-disposition'), null);
    assert.deepEqual(Buffer.from(await cover.arrayBuffer()), png);
    const listing = await fetch(`${base}/games${path}/`);
    assert.equal(listing.headers.get('content-type'), 'application/json');
    assert.deepEqual((await listing.json() as { name: string }[]).map(entry => entry.name), ['assets', 'game']);
    const rom = await fetch(`${base}/games${path}/game/jeu.nds`);
    assert.equal(rom.headers.get('content-disposition'), 'attachment');
    assert.equal(await rom.text(), 'rom-test');
    assert.equal((await fetch(`${base}/api/game-assets${path}`)).status, 405);
    assert.equal((await fetch(`${base}/api/game-assets/Nintendo%20DS/%2e%2e%2fsecret`, { method: 'POST' })).status, 400);
    const upload = await fetch(`${base}/api/game-assets${path}/logo`, {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(png),
    });
    assert.equal(upload.status, 200);
    const uploaded = await upload.json() as { url: string };
    const saved = await fetch(`${base}${uploaded.url}`);
    assert.equal(saved.headers.get('content-type'), 'image/png');
    assert.equal((await sharp(Buffer.from(await saved.arrayBuffer())).metadata()).format, 'png');
    assert.equal((await fetch(`${base}/api/game-assets${path}/logo`, {
        method: 'PUT', body: 'bad image',
    })).status, 400);
    assert.equal((await fetch(`${base}/api/game-assets${path}/logo`, {
        method: 'PUT', headers: { Origin: 'https://other.example' }, body: new Uint8Array(png),
    })).status, 403);
});