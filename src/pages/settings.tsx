import { useContext, useEffect, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { Layout, DefaultSelect, ToggleButton } from '../components';
import WarningIcon from "@mui/icons-material/Warning"
import { SUPPORTED_LANGUAGES } from "../i18n";
import { palettes, ThemeContext } from "../theme";

const langOptions = Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => ({
    label,
    value: code,
}));

const Settings = () => {
    const { t } = useTranslation();

    const themeOptions = Object.keys(palettes).map((key) => ({
        label: t(`settings.themes.${key}`),
        value: key,
    }));
    const { themeKey, setThemeKey } = useContext(ThemeContext);
    const [effectEnabled, setEffectEnabled] = useState(localStorage.getItem('effect') === 'true');

    const [hasSteamGridKey, setHasSteamGridKey] = useState<boolean | null>(null);

    useEffect(() => {
        let ignore = false;

        const loadConfig = async () => {
            try {
                const response = await fetch('/api/config');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const config = await response.json();
                if (!ignore && typeof config.hasSteamGridKey === 'boolean') {
                    setHasSteamGridKey(config.hasSteamGridKey);
                }
            } catch (error) {
                console.error('Unable to load config', error);
            }
        };

        void loadConfig();

        return () => {
            ignore = true;
        };
    }, []);

    const currentLang = i18n.language;

    const handleLangChange = (value: string) => {
        i18n.changeLanguage(value);
        localStorage.setItem('lang', value);
    };

    const handleEffectChange = (value: string) => {
        const enabled = value === "settings.choices.enable";
        localStorage.setItem('effect', enabled.toString());
        setEffectEnabled(enabled);
    }

    return (
        <Layout>
            <Stack sx={{ marginBottom: 4 }}>
                <Typography variant="h5" sx={{ marginBottom: 2 }}>{t('settings.lang')}</Typography>
                <DefaultSelect
                    label={t('settings.lang')}
                    variant="outlined"
                    options={langOptions}
                    value={currentLang}
                    onChange={handleLangChange}
                />
            </Stack>
            <Stack sx={{ marginBottom: 4 }}>
                <Typography variant="h5" sx={{ marginBottom: 2 }}>{t('settings.theme')}</Typography>
                <DefaultSelect
                    label={t('settings.theme')}
                    variant="outlined"
                    options={themeOptions}
                    value={themeKey}
                    onChange={setThemeKey}
                />
            </Stack>
            <Stack>
                <Typography variant="h5" sx={{ marginBottom: 2 }}>{t('settings.effect')}</Typography>
                <ToggleButton
                    values={["settings.choices.enable", "settings.choices.disable"]}
                    value={effectEnabled ? "settings.choices.enable" : "settings.choices.disable"}
                    action={handleEffectChange}
                />
            </Stack>
            { hasSteamGridKey === false && <Typography variant="h6" sx={{ marginTop: 4, color: 'text.secondary', display: 'flex', alignItems: 'center' }}><WarningIcon sx={{ marginRight: 1 }} />{t('settings.missing')}</Typography>}
        </Layout>
    );
};

export default Settings;