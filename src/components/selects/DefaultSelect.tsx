import { FormControl, MenuItem, Select, useMediaQuery, useTheme } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

export default function DefaultSelect({ label, variant, value, setValue, onChange, options }: { label?: string, variant: "standard" | "outlined" | "filled", value: string, setValue?: (value: string) => void, onChange?: (value: string) => void, options?: string[] | { value: string; label: string }[] }) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    function handleChange(event: SelectChangeEvent) {
        const val = event.target.value;
        if (onChange) onChange(val);
        else if (setValue) setValue(val);
    }

    return (
        <FormControl sx={{ width: variant === "standard" ? "100%" : "auto" }}>
            <Select
            labelId="select-label"
            id="select"
            value={value}
            label={label}
            variant={variant}
            size={isMobile ? "small" : "medium"}
            onChange={handleChange}
            MenuProps={{
                slotProps: {
                    paper: {
                        sx: {
                            borderRadius: "8px",
                            backgroundColor: variant === "standard" ? undefined : "primary.main",
                            color: "primary.contrastText",
                        }
                    }
                }
            }}
            sx={{ borderRadius: "8px", "& .MuiOutlinedInput-notchedOutline": { borderRadius: "8px" }, backgroundColor: variant === "standard" ? undefined : "primary.main", color: "primary.contrastText", width: "250px", height: variant === "standard" ? undefined : "45px", "& .MuiSvgIcon-root": { color: "primary.contrastText" } }}
            >
                {options?.map((option, index) => {
                    const val = typeof option === "string" ? option : option.value;
                    const lbl = typeof option === "string" ? option : option.label;
                    return <MenuItem key={index} value={val}>{lbl}</MenuItem>;
                })}
            </Select>
        </FormControl>
    );
}