import { Menu, MenuItem } from "@mui/material";

export default function ContextMenu({
    anchorPosition,
    open,
    onClose,
    onExited,
    options
}: {
    anchorPosition: { x: number, y: number } | null,
    open: boolean,
    onClose: () => void,
    onExited?: () => void,
    options: { label: string, action: () => void }[]
}) {

    return (
        <Menu
            open={open}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={anchorPosition ? { top: anchorPosition.y, left: anchorPosition.x } : undefined}
            slotProps={{
                paper: { sx: { borderRadius: 0.4 } },
                transition: { onExited }
            }}
        >
            {options.map((option, index) => (
                <MenuItem key={index} onClick={() => { option.action(); onClose(); }}>
                    {option.label}
                </MenuItem>
            ))}
        </Menu>
    );
}