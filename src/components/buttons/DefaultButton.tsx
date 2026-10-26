import { Button, useMediaQuery, useTheme } from "@mui/material";

export default function DefaultButton({ label, icon: Icon, action, onKeyDown, href, download }: { label?: string, icon?: React.ElementType, action?: () => void, onKeyDown?: (e: React.KeyboardEvent) => void, href?: string, download?: string }) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Button
        variant="contained"
        color="primary"
        onClick={action}
        onKeyDown={onKeyDown}
        {...(href ? { component: "a", href, download } : {})}
        sx={{
            width: "15.5rem",
            height: "2.8rem",
            justifyContent: "flex-start",
            padding: "0.8rem",
            boxShadow: "none",
            fontSize: "1rem",
            lineHeight: 1.2,
            borderRadius: "8px",
            "&:hover": { boxShadow: "none" },
        }}
    >
      {Icon && <Icon sx={{ fontSize: isMobile ? 25 : 30, marginRight: 1 }} />}
      {label}
    </Button>
  );
}