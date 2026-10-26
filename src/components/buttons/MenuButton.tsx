import { Stack, Typography } from "@mui/material";

export default function MenuButton({ label, icon: Icon, action, onKeyDown }: { label?: string, icon: React.ElementType, action: () => void, onKeyDown?: (e: React.KeyboardEvent) => void }) {
  return (
    <Stack sx={{ flexDirection: "row", alignItems: "center", cursor: "pointer", gap: "0.5rem", padding: "0px 12px", width: "fit-content", "&:hover": { boxShadow: "inset 0 -2px 0 currentColor" }, }}>
      <Icon sx={{ fontSize: 30 }} />
      <Typography
          onClick={action}
          onKeyDown={onKeyDown}
          sx={{
              fontSize: "1.2rem",
              justifyContent: "flex-start",
              borderRadius: "0px",
          }}
      >
          {label}
      </Typography>
    </Stack>
  );
}