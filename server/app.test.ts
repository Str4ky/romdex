import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import sharp from 'sharp';
import { createApp } from './app.ts';

async function fixture(t: TestContext, gameName = 'Jeu été #1', apiKey = '') {
    const root = await mkdtemp(join(tmpdir(), 'romdex-server-'));
    const games = join(root, 'games');
    const dist = join(root, 'dist');
    const game = join(games, 'Nintendo DS', gameName);
    await mkdir(join(game, 'game'), { recursive: true });
    await mkdir(join(game, 'assets'));
    await mkdir(join(dist, 'assets'), { recursive: true });
    await writeFile(join(dist, 'index.html'), '<html>Romdex production</html>');
    await writeFile(join(dist, 'assets', 'app.js'), 'console.log("compiled")');
    await writeFile(join(game, 'game', 'jeu.nds'), '0123456789');
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#ff000080' } }).png().toBuffer();
    await writeFile(join(game, 'assets', 'cover.png'), png);
    const server = createApp({ gamesPath: games, distPath: dist, apiKey }).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(async () => {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await rm(root, { recursive: true, force: true });
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    return { root, games, game, dist, png, base: `http://127.0.0.1:${address.port}`, path: `/games/Nintendo%20DS/${encodeURIComponent(gameName)}` };
}

for (const gameName of ['Mario & Luigi: Superstar Saga', 'Mario Kart: Double Dash!!', 'The Simpsons: Hit & Run']) {
    test(`Linux production: local artwork for ${gameName}`, { skip: process.platform === 'win32' }, async t => {
        const { base, path, png } = await fixture(t, gameName);
        const endpoint = `${base}/api/game-assets${path.slice('/games'.length)}`;
        const response = await fetch(endpoint, { method: 'POST' });
        assert.equal(response.status, 200);
        const assets = await response.json() as { cover: string };
        const image = await fetch(base + assets.cover);
        assert.equal(image.status, 200);
        assert.equal(image.headers.get('content-type'), 'image/png');
        assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
        assert.equal((await fetch(`${base}${path}/game/jeu.nds`)).status, 200);
    });
}

test('production: compiled frontend, SPA routes and missing resources', async t => {
    const { base } = await fixture(t);
    for (const path of ['/', '/all', '/ds/Mario%20Kart%20DS']) {
        const response = await fetch(base + path);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') ?? '', /text\/html/);
        assert.match(await response.text(), /Romdex production/);
    }
    const js = await fetch(`${base}/assets/app.js`);
    assert.equal(js.status, 200);
    assert.match(await js.text(), /compiled/);
    assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
    assert.equal((await fetch(`${base}/api/missing`)).status, 404);
});

test('production: JSON listings and missing files without HTML fallback', async t => {
    const { base, path } = await fixture(t);
    const root = await fetch(`${base}/games/`);
    assert.equal(root.status, 200);
    assert.equal((await root.json() as { name: string }[])[0].name, 'Nintendo DS');
    const response = await fetch(`${base}${path}/`);
    assert.deepEqual((await response.json() as { name: string }[]).map(entry => entry.name), ['assets', 'game']);
    assert.equal((await fetch(`${base}${path}/game/missing.nds`)).status, 404);
    assert.equal((await fetch(`${base}/games/`, { method: 'DELETE' })).status, 405);
});

test('production: ROM downloads, HEAD, Range and invalid ranges', async t => {
    const { base, path } = await fixture(t);
    const url = `${base}${path}/game/jeu.nds`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition') ?? '', /attachment/);
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.equal(await response.text(), '0123456789');
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
    const partial = await fetch(url, { headers: { Range: 'bytes=2-5' } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(await partial.text(), '2345');
    const suffix = await fetch(url, { headers: { Range: 'bytes=-3' } });
    assert.equal(suffix.status, 206);
    assert.equal(await suffix.text(), '789');
    const invalid = await fetch(url, { headers: { Range: 'bytes=99-100' } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), 'bytes */10');
});

test('production: displayable artwork, uploads and disk persistence', async t => {
    const { base, path, png, game } = await fixture(t);
    const image = await fetch(`${base}${path}/assets/cover.png`);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.equal(image.headers.get('content-disposition'), null);
    assert.equal(image.headers.get('cache-control'), 'no-cache');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const endpoint = `${base}/api/game-assets${path.slice('/games'.length)}`;
    const existing = await fetch(endpoint, { method: 'POST' });
    assert.equal(existing.status, 200);
    assert.ok((await existing.json() as { cover?: string }).cover);
    const uploaded = await fetch(`${endpoint}/logo`, { method: 'PUT', body: new Uint8Array(png) });
    assert.equal(uploaded.status, 200);
    const saved = await fetch(base + (await uploaded.json() as { url: string }).url);
    assert.equal(saved.status, 200);
    assert.equal((await sharp(await readFile(join(game, 'assets', 'logo.png'))).metadata()).format, 'png');
    assert.equal((await fetch(`${endpoint}/logo`, { method: 'PUT', headers: { Origin: 'https://other.example' }, body: new Uint8Array(png) })).status, 403);
});

test('production: rejects path traversal and hidden files', async t => {
    const { base } = await fixture(t);
    for (const path of ['/games/%2e%2e/package.json', '/games/.secret', '/games/a%5c..%5csecret', '/games/%ZZ']) {
        const status = await new Promise<number | undefined>((resolve, reject) => {
            request(base + '/', { path }, res => { res.resume(); resolve(res.statusCode); }).on('error', reject).end();
        });
        assert.ok(status === 400 || status === 403);
    }
});

test('production: rejects symlinks outside the library', async t => {
    const { root, games, base } = await fixture(t);
    const outside = join(root, 'outside');
    await mkdir(outside);
    await writeFile(join(outside, 'secret'), 'private');
    await symlink(outside, join(games, 'escape'), 'junction');
    assert.equal((await fetch(`${base}/games/escape/secret`)).status, 403);
    const listing = await fetch(`${base}/games/`);
    assert.equal((await listing.json() as { name: string }[]).some(entry => entry.name === 'escape'), false);
});

for (const apiKey of ['', '   ', 'test-key']) {
    test(`production: config reports ${apiKey.trim() ? 'a configured' : 'a missing'} API key without exposing it`, async t => {
        const { base } = await fixture(t, undefined, apiKey);
        const response = await fetch(`${base}/api/config`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await response.json(), { hasSteamGridKey: Boolean(apiKey.trim()) });
    });
}