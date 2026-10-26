import { useRef } from 'react';
import { replaceGameAsset } from '../services/steamgriddb';
import type { AssetField } from '../services/steamgriddb';

export function useAssetUpload() {
    const input = useRef<HTMLInputElement>(null);
    const target = useRef<{ consoleName: string; gameName: string; field: AssetField } | null>(null);
    const busy = useRef(false);

    const chooseImage = (consoleName: string, gameName: string, field: AssetField) => {
        if (busy.current || !consoleName || !gameName) return;
        target.current = { consoleName, gameName, field };
        input.current?.click();
    };

    const uploadControls = (
        <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            hidden
            onChange={async event => {
                const file = event.currentTarget.files?.[0];
                const destination = target.current;
                event.currentTarget.value = '';
                if (!file || !destination || busy.current) return;
                if (file.size > 20 * 1024 * 1024) {
                    console.error('Asset upload: image exceeds 20 MB');
                    return;
                }
                busy.current = true;
                try {
                    await replaceGameAsset(destination.consoleName, destination.gameName, destination.field, file);
                } catch (error) {
                    console.error('Asset upload failed:', error);
                } finally {
                    busy.current = false;
                }
            }}
        />
    );

    return { chooseImage, uploadControls };
}