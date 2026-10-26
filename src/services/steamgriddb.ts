export interface GameAssets {
    cover: string | null;
    banner: string | null;
    logo: string | null;
}

export type AssetField = keyof GameAssets;
export const assetUpdatedEvent = 'romdex:asset-updated';
export interface AssetUpdate {
    consoleName: string;
    gameName: string;
    field: AssetField;
    url: string;
}

const replacements = new Map<string, Partial<GameAssets>>();

export async function replaceGameAsset(consoleName: string, gameName: string, field: AssetField, file: File) {
    const path = `${encodeURIComponent(consoleName)}/${encodeURIComponent(gameName)}`;
    await inflight.get(path)?.catch(() => {});
    const response = await fetch(`/api/game-assets/${path}/${field}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
    });
    if (!response.ok) throw new Error(`Asset upload: HTTP ${response.status}`);
    const { url } = await response.json() as { url: string };
    replacements.set(path, { ...replacements.get(path), [field]: url });
    window.dispatchEvent(new CustomEvent<AssetUpdate>(assetUpdatedEvent, { detail: { consoleName, gameName, field, url } }));
}

const inflight = new Map<string, Promise<GameAssets>>();

export function getGameAssets(consoleName: string, gameName: string): Promise<GameAssets> {
    const path = `${encodeURIComponent(consoleName)}/${encodeURIComponent(gameName)}`;
    const pending = inflight.get(path);
    if (pending) return pending;
    const promise = fetch(`/api/game-assets/${path}`, { method: 'POST' })
        .then(async response => {
            if (!response.ok) throw new Error(`Game assets: HTTP ${response.status}`);
            const assets = await response.json() as GameAssets;
            return { ...assets, ...replacements.get(path) };
        })
        .finally(() => inflight.delete(path));
    inflight.set(path, promise);
    return promise;
}
