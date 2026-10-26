import { useReducer, useEffect } from 'react';
import consolesData from '../data/consoles.json';
import type { NginxEntry } from './useDownloads';

export interface GameEntry {
    name: string;
    consoleAlias: string;
    consoleName: string;
}

type State = { games: GameEntry[]; loading: boolean };
type Action = { type: 'start' } | { type: 'done'; games: GameEntry[] };

function reducer(_: State, action: Action): State {
    if (action.type === 'start') return { games: [], loading: true };
    return { games: action.games, loading: false };
}

async function fetchDirs(path: string): Promise<NginxEntry[]> {
    try {
        const r = await fetch(`/games/${path}`);
        const data: NginxEntry[] = await r.json();
        return data.filter(e => e.type === 'directory');
    } catch {
        return [];
    }
}

export function useGameList(consoleAlias?: string): { games: GameEntry[]; loading: boolean } {
    const [state, dispatch] = useReducer(reducer, { games: [], loading: true });

    useEffect(() => {
        let cancelled = false;
        dispatch({ type: 'start' });

        if (consoleAlias) {
            const consoleMeta = consolesData.find(c => c.alias === consoleAlias);
            if (!consoleMeta) { dispatch({ type: 'done', games: [] }); return; }

            fetchDirs(encodeURIComponent(consoleMeta.name) + '/').then(dirs => {
                if (cancelled) return;
                dispatch({
                    type: 'done',
                    games: dirs.map(d => ({ name: d.name, consoleAlias: consoleAlias, consoleName: consoleMeta.name }))
                });
            });
        } else {
            fetchDirs('').then(async consoleDirs => {
                if (cancelled) return;

                const matched = consoleDirs
                    .map(d => {
                        const meta = consolesData.find(c => c.name === d.name);
                        return meta ? { name: d.name, alias: meta.alias } : null;
                    })
                    .filter(Boolean) as { name: string; alias: string }[];

                const nested = await Promise.all(
                    matched.map(c =>
                        fetchDirs(encodeURIComponent(c.name) + '/').then(dirs =>
                            dirs.map(d => ({ name: d.name, consoleAlias: c.alias, consoleName: c.name }))
                        )
                    )
                );

                if (!cancelled) dispatch({ type: 'done', games: nested.flat() });
            });
        }

        return () => { cancelled = true; };
    }, [consoleAlias]);

    return state;
}
