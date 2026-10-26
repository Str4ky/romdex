import { useReducer, useEffect } from 'react';
import { assetUpdatedEvent, getGameAssets } from '../services/steamgriddb';
import type { AssetUpdate, GameAssets } from '../services/steamgriddb';

const emptyAssets: GameAssets = { cover: null, banner: null, logo: null };
type State = GameAssets & { key: string; loading: boolean };
type Action = State | { update: AssetUpdate; key: string };

function reducer(state: State, action: Action): State {
    if ('update' in action) {
        return { ...(state.key === action.key ? state : emptyAssets), key: action.key, loading: false, [action.update.field]: action.update.url };
    }
    return action;
}

export function useSteamGridDB(consoleName: string, gameName: string) {
    const key = JSON.stringify([consoleName, gameName]);
    const [state, dispatch] = useReducer(reducer, { ...emptyAssets, key: '', loading: true });

    useEffect(() => {
        const handleUpdate = (event: Event) => {
            const update = (event as CustomEvent<AssetUpdate>).detail;
            if (update.consoleName === consoleName && update.gameName === gameName) dispatch({ update, key });
        };
        window.addEventListener(assetUpdatedEvent, handleUpdate);
        return () => window.removeEventListener(assetUpdatedEvent, handleUpdate);
    }, [consoleName, gameName, key]);

    useEffect(() => {
        if (!consoleName || !gameName) return;
        let cancelled = false;
        getGameAssets(consoleName, gameName)
            .then(assets => { if (!cancelled) dispatch({ ...assets, key, loading: false }); })
            .catch(() => {
                if (!cancelled) dispatch({ ...emptyAssets, key, loading: false });
            });
        return () => { cancelled = true; };
    }, [consoleName, gameName, key]);

    return state.key === key ? state : { ...emptyAssets, loading: Boolean(consoleName && gameName) };
}
