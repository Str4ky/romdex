import { TextField, useMediaQuery, useTheme } from "@mui/material";

export default function TextInput({ placeholder, value, variant, type, onChange, error, helperText, onKeyDown, inputRef }: { placeholder?: string, value?: string, variant: "outlined" | "filled" | "standard", type?: string, small?: boolean, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, error?: boolean, helperText?: string, onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void, inputRef?: React.Ref<HTMLInputElement> }) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.down("md"));

    return (
        <TextField
            placeholder={placeholder}
            variant={variant}
            size={isMobile ? "small" : "medium"}
            value={value}
            onChange={onChange}
            error={error}
            helperText={helperText}
            onKeyDown={onKeyDown}
            inputRef={inputRef}
            sx={{
                width: "100%",
                "& .MuiInputBase-input": {
                    fontSize: type === "big" ? isTablet ? "1.6rem" : "2rem" : undefined,
                },
                "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    height: "50px",
                },
                marginBottom: 3,
            }}
        />
    );
}