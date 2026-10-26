import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function DefaultButton({ values, value, action, onKeyDown }: { values?: string[], value?: string, action?: (value: string) => void, onKeyDown?: (e: React.KeyboardEvent) => void, href?: string, download?: string }) {

    const { t } = useTranslation();

    return (
        <ToggleButtonGroup
            value={value}
            exclusive
            onChange={(_e, newValue) => { if (newValue !== null) action?.(newValue); }}
            onKeyDown={onKeyDown}
        >
        {values?.map((item) => (
            <ToggleButton key={item} value={item} sx={{
                width: "7.8rem",
                height: "2.8rem",
                justifyContent: "center",
                padding: "0.8rem",
                fontSize: "1rem",
                textTransform: "none",
                lineHeight: 1.2,
                borderRadius: "8px",
                color: "text.secondary",
                backgroundColor: "action.hover",
                border: "1px solid rgba(255,255,255,0.15) !important",
                "&:hover": { backgroundColor: "action.selected" },
                "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    border: "1px solid transparent !important",
                },
                "&.Mui-selected:hover": { backgroundColor: "primary.dark" },
            }}>
            {t(item)}
            </ToggleButton>
        ))}
        </ToggleButtonGroup>
    );
}