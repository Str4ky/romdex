import { useReducer, useEffect } from 'react';

export interface NginxEntry {
    name: string;
    type: 'file' | 'directory';
    mtime: string;
    size?: number;
}

type State = { entries: NginxEntry[]; loading: boolean };
type Action = { type: 'start' } | { type: 'done'; entries: NginxEntry[] };

function reducer(_: State, action: Action): State {
    if (action.type === 'start') return { entries: [], loading: true };
    return { entries: action.entries, loading: false };
}

export function useDownloads(path: string) {
    const [state, dispatch] = useReducer(reducer, { entries: [], loading: true });

    useEffect(() => {
        let cancelled = false;
        dispatch({ type: 'start' });

        fetch(`/games/${path}`)
            .then(r => r.json())
            .then((data: NginxEntry[]) => {
                if (!cancelled) {
                    dispatch({ type: 'done', entries: data });
                }
            })
            .catch(() => { if (!cancelled) dispatch({ type: 'done', entries: [] }); });

        return () => { cancelled = true; };
    }, [path]);

    return state;
}
