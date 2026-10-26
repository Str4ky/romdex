import { Box, Stack } from '@mui/material'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Layout, TextInput, GameCard, ContextMenu } from '../components'
import { useTranslation } from 'react-i18next';
import { useGameList } from '../hooks/useGameList';
import { getGameAssets } from '../services/steamgriddb';
import { useAssetUpload } from '../hooks/useAssetUpload';
import consolesData from '../data/consoles.json';

const Games = () => {
    const { console } = useParams<{ console: string }>();
    const [search, setSearch] = useState('');
    const { t } = useTranslation();
    const { games } = useGameList(console === 'all' ? undefined : console);
    const { chooseImage, uploadControls } = useAssetUpload();

    useEffect(() => {
        games.forEach(game => {
            void getGameAssets(game.consoleName, game.name).catch(error => {
                globalThis.console.error('Unable to prepare game assets', error);
            });
        });
    }, [games]);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [selectedGame, setSelectedGame] = useState<{ name: string; consoleAlias: string } | null>(null);

    useEffect(() => {
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, []);

    const handleContextMenu = (event: React.MouseEvent, game: { name: string; consoleAlias: string }) => {
        event.preventDefault();
        setSelectedGame(game);
        event.stopPropagation();

        const x = event.clientX;
        const y = event.clientY;

        setMenuOpen(false);
        requestAnimationFrame(() => {
            setMenuPosition({ x, y });
            setMenuOpen(true);
        });
    };

    const filtered = games.filter((game) =>
        game.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout>
            <TextInput placeholder={t("input.search")} variant="outlined" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <Stack sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 3.5, paddingTop: 1, paddingBottom: 1, alignContent: 'flex-start' }}>
                    {filtered.map((game, index) => (
                        <GameCard key={index} name={game.name} consoleAlias={game.consoleAlias} onContextMenu={(e) => handleContextMenu(e, game)} />
                    ))}
                </Stack>
            </Box>
            <ContextMenu
                anchorPosition={menuPosition}
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                options={[{ label: t('game.context.poster'), action: () => {
                    if (!selectedGame) return;
                    const consoleName = consolesData.find(item => item.alias === selectedGame.consoleAlias)?.name ?? '';
                    chooseImage(consoleName, selectedGame.name, 'cover');
                } }]}
            />
            {uploadControls}
        </Layout>
    );
}

export default Games;