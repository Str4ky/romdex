import { useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline, GlobalStyles, useTheme } from '@mui/material'
import { createAppTheme, ThemeContext } from './theme'
import { Routes, Route, Navigate } from 'react-router-dom'
import Games from './pages/games'
import Game from './pages/game'
import Settings from './pages/settings'

function FaviconSync() {
  const theme = useTheme();

  useEffect(() => {
    const color = theme.palette.text.primary;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="${color}"><path d="M480-540 360-660v-220h240v220L480-540Zm180 180L540-480l120-120h220v240H660Zm-580 0v-240h220l120 120-120 120H80ZM360-80v-220l120-120 120 120v220H360Z"/></svg>`;
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [theme.palette.text.primary]);

  return null;
}

function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('theme') ?? 'purple')

  const handleSetThemeKey = (key: string) => {
    localStorage.setItem('theme', key)
    setThemeKey(key)
  }

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey: handleSetThemeKey }}>
      <ThemeProvider theme={createAppTheme(themeKey)}>
        <FaviconSync />
        <CssBaseline />
        <GlobalStyles styles={{ 'html, body, #root': { height: '100%', overflow: 'hidden' } }} />
        <Routes>
          <Route path="/" element={<Navigate to="/all" />} />
          <Route path="/all" element={<Games />} />
          <Route path="/:console" element={<Games />} />
          <Route path="/:consoleAlias/:gameName" element={<Game />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export default App
