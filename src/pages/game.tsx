import { Stack, useMediaQuery, useTheme, Typography } from '@mui/material'
import { Layout, DefaultSelect, DefaultButton, ContextMenu } from '../components'
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSteamGridDB } from '../hooks/useSteamGridDB';
import { useDownloads } from '../hooks/useDownloads';
import { useEffect, useState } from 'react';
import consolesData from '../data/consoles.json';
import DownloadIcon from '@mui/icons-material/Download';
import { useAssetUpload } from '../hooks/useAssetUpload';

const Game = () => {
    const { t } = useTranslation();
    const { consoleAlias, gameName } = useParams<{ consoleAlias: string; gameName: string }>();
    const game = gameName ? decodeURIComponent(gameName) : '';
    const alias = consoleAlias ? decodeURIComponent(consoleAlias) : '';

    const consoleMeta = consolesData.find(c => c.alias === alias);
    const consoleName = consoleMeta?.name ?? '';

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const { banner, logo } = useSteamGridDB(consoleName, game);
    const { chooseImage, uploadControls } = useAssetUpload();

    const typePath = consoleName && game
        ? `${encodeURIComponent(consoleName)}/${encodeURIComponent(game)}/`
        : '';
    const { entries: typeFolders } = useDownloads(typePath);
    const typeOptions = typeFolders.filter(e => e.type === 'directory' && e.name !== 'assets').map(e => ({
        value: e.name,
        label: t(`game.types.${e.name}`, e.name),
    }));
    const typeValues = typeOptions.map(o => o.value);

    const [selectedType, setSelectedType] = useState('');
    const effectiveType = typeValues.includes(selectedType) ? selectedType : (typeValues[0] ?? '');

    const filesPath = consoleName && game && effectiveType
        ? `${encodeURIComponent(consoleName)}/${encodeURIComponent(game)}/${encodeURIComponent(effectiveType)}/`
        : '';
    const { entries: typeFiles } = useDownloads(filesPath);
    const fileOptions = typeFiles.filter(e => e.type === 'file').map(e => ({
        value: e.name,
        label: (e.name.split('.').pop() ?? e.name).toUpperCase(),
    }));

    const [selectedFile, setSelectedFile] = useState('');
    const fileValues = fileOptions.map(f => f.value);
    const effectiveFile = fileValues.includes(selectedFile) ? selectedFile : (fileValues[0] ?? '');

    useEffect(() => {
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, []);

    const handleTypeChange = (type: string) => {
        setSelectedType(type);
        setSelectedFile('');
    };

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const x = event.clientX;
        const y = event.clientY;

        setMenuOpen(false);
        requestAnimationFrame(() => {
            setMenuPosition({ x, y });
            setMenuOpen(true);
        });
    };

    const downloadUrl = consoleName && game && effectiveType && effectiveFile
        ? `/games/${encodeURIComponent(consoleName)}/${encodeURIComponent(game)}/${encodeURIComponent(effectiveType)}/${encodeURIComponent(effectiveFile)}`
        : '';

    return (
        <Layout padding={0}>
            <Stack>
                <Stack style={{ position: 'relative', width: '100%', height: isMobile ? '20vh' : isTablet ? '25vh' : '35vh', backgroundColor: theme.palette.primary.main }} onContextMenu={(e) => handleContextMenu(e)}>
                    {banner && <img src={banner} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left' }} />}
                    {logo ? <img src={logo} style={{ position: 'absolute', bottom: '16px', left: '24px', maxWidth: isMobile ? '80%' : isTablet ? '60%' : '30%', maxHeight: isMobile ? '40%' : isTablet ? '50%' : '60%', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }} /> : (
                        <Typography
                            component="h1"
                            sx={{
                                position: 'absolute',
                                bottom: '16px',
                                left: '24px',
                                right: '24px',
                                m: 0,
                                maxHeight: 'calc(100% - 32px)',
                                overflow: 'hidden',
                                overflowWrap: 'anywhere',
                                fontSize: { xs: '1.5rem', sm: '2rem', lg: '3rem' },
                                fontWeight: 'normal',
                                lineHeight: 1.2,
                                color: banner ? '#fff' : 'primary.contrastText',
                                textShadow: banner ? '0px 2px 4px rgba(0,0,0,0.8)' : 'none',
                            }}
                        >
                            {game}
                        </Typography>
                    )}
                </Stack>

                <Stack sx={{ padding: '24px', gap: 3 }}>
                    <Typography variant="h5">{t(`game.download.title`)}</Typography>
                    {typeOptions.length > 0 && (
                        <Stack direction={isTablet ? 'column' : 'row'} sx={{ gap: 2, alignItems: isTablet ? 'flex-start' : 'center' }}>
                            <DefaultSelect
                                variant="outlined"
                                value={effectiveType}
                                onChange={handleTypeChange}
                                options={typeOptions}
                            />
                            <DefaultSelect
                                variant="outlined"
                                value={effectiveFile}
                                onChange={setSelectedFile}
                                options={fileOptions}
                            />
                            <DefaultButton
                                label={t('game.download.button')}
                                icon={DownloadIcon}
                                href={downloadUrl}
                                download={effectiveFile}
                            />
                        </Stack>
                    )}
                </Stack>
            </Stack>
            <ContextMenu
                anchorPosition={menuPosition}
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                options={[
                    { label: t('game.context.banner'), action: () => chooseImage(consoleName, game, 'banner') },
                    { label: t('game.context.logo'), action: () => chooseImage(consoleName, game, 'logo') },
                ]}
            />
            {uploadControls}
        </Layout>
    );
}

export default Game;
