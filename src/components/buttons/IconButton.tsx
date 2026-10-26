import { Fab, useMediaQuery, useTheme } from "@mui/material";

export default function IconButton({ icon: Icon, fixedSize, action, onKeyDown }: { icon: React.ElementType, fixedSize?: boolean, action: () => void, onKeyDown?: (e: React.KeyboardEvent) => void }) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Fab
        color="primary"
        onClick={action}
        onKeyDown={onKeyDown}
        size={ fixedSize ? undefined : isMobile ? "small" : "medium" }
        sx={{
            boxShadow: fixedSize ? undefined : "none",
            gap: "0.5rem",
            borderRadius: "8px",
            "&:hover": { boxShadow: fixedSize ? undefined : "none" },
        }}
    >
        <Icon sx={{ fontSize: fixedSize ? 25 : isMobile ? 20 : 30 }} />
    </Fab>
  );
}