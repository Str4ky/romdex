import { createContext } from "react";
import { createTheme } from "@mui/material/styles";

export const palettes = {
  purple: {
    background: "#080114",
    surface: "#171127",
    accent: "#362253",
    accentHover: "#442f64",
    text: "#b7a6d3",
  },
  blue: {
    background: "#01030f",
    surface: "#100d24",
    accent: "#242a5c",
    accentHover: "#30318a",
    text: "#a2a6d8",
  },
  green: {
    background: "#010e06",
    surface: "#0f1f13",
    accent: "#225832",
    accentHover: "#2f7443",
    text: "#a0cba9",
  },
  red: {
    background: "#120002",
    surface: "#22080a",
    accent: "#682332",
    accentHover: "#792d3e",
    text: "#d4a0a4",
  },
  orange: {
    background: "#120400",
    surface: "#1f0a00",
    accent: "#703720",
    accentHover: "#804229",
    text: "#d4a488",
  },
  black: {
    background: "#121212",
    surface: "#1e1e1e",
    accent: "#2c2d2e",
    accentHover: "#38393a",
    text: "#e1e1e1",
  }
} as const;

type PaletteKey = keyof typeof palettes;

export function createAppTheme(key: string) {
  const paletteKey: PaletteKey = key in palettes ? (key as PaletteKey) : "purple";
  const c = palettes[paletteKey];

  return createTheme({
  cssVariables: true,
  shape: {
    borderRadius: 24,
  },
  palette: {
    background: {
      default: c.background,
      paper: c.surface,
    },
    primary: {
      main: c.accent,
      dark: c.accentHover,
      contrastText: c.text,
    },
    text: {
      primary: c.text,
      secondary: c.text,
    },
  },
  typography: {
    fontFamily:
      "'Saira', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fontWeightLight: 500,
    fontWeightRegular: 500,
    fontWeightMedium: 500,
    fontWeightBold: 500,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body": { minHeight: "100%" },
        body: { backgroundColor: c.background },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: "none",
          textTransform: "none",
          "&.MuiButton-containedPrimary": {
            backgroundColor: c.accent,
            color: c.text,
            "&:hover": {
              backgroundColor: c.accentHover,
              boxShadow: "none",
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: c.surface,
          color: c.text,
        },
        notchedOutline: {
          border: "none",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: c.text,
          "&.Mui-focused": { color: c.text },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: c.text,
          "&.Mui-focused": { color: c.text },
        },
      },
    },
  },
  });
}

export const ThemeContext = createContext<{ themeKey: string; setThemeKey: (key: string) => void }>({  themeKey: 'purple',
  setThemeKey: () => {},
});