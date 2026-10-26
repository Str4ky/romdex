
import { Box, Stack, Slide } from "@mui/material";
import { TitleSmall, MenuButton } from "../";
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import { consoleIconMap } from "../../img";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import consolesData from "../../data/consoles.json";
import { useDownloads } from "../../hooks/useDownloads";

interface MenuProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Menu({ isMobile = false, isOpen = true, onToggle }: MenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { entries } = useDownloads('');

  const consoles = consolesData
    .filter(c => entries.some(e => e.type === 'directory' && e.name === c.name))
    .map(c => ({
      ...c,
      icon: consoleIconMap[c.icon] ?? VideogameAssetIcon,
    }));

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) onToggle?.();
  };

  const content = (
    <Stack
      spacing={4}
      sx={{
        position: isMobile ? undefined : "fixed",
        width: 240,
        height: "100%",
        padding: "12px 0px 12px 0px",
        backgroundColor: "background.paper",
      }}
    >
      <TitleSmall />

      <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
        <MenuButton label={t("menu.all")} icon={VideogameAssetIcon} action={() => handleNavigate("/all")} />
        {consoles.map((console) => (
          <MenuButton key={console.name} label={console.name} icon={console.icon} action={() => handleNavigate(`/${console.alias}`)} />
        ))}
      </Stack>

      <Stack spacing={2.5} sx={{ marginBottom: 4 }}>
        <MenuButton label={t("menu.settings")} icon={SettingsIcon} action={() => handleNavigate("/settings")} />
      </Stack>
    </Stack>
  );

  if (!isMobile) return content;

  return (
    <>
      {isOpen && (
        <Box
          onClick={onToggle}
          sx={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 1200 }}
        />
      )}

      <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100%",
            zIndex: 1500,
          }}
        >
          {content}
        </Box>
      </Slide>
    </>
  );
}