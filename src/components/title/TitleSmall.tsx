import { Stack, Typography } from "@mui/material";
import GamepadIcon from '@mui/icons-material/Gamepad';
import { useTranslation } from "react-i18next";

export default function TitleSmall() {
    const { t } = useTranslation();

    return (
        <Stack
            sx={{ flexDirection: "row", alignItems: "center", gap: 1, padding: "0px 0px 0px 12px" }}
        >
            <GamepadIcon sx={{ fontSize: 40, display: "block" }} />
            <Typography variant={"h4"} sx={{ whiteSpace: "nowrap" }}>
                {t("app.title")}
            </Typography>
        </Stack>
    );
}