import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSteamGridDB } from '../../hooks/useSteamGridDB';
import { useMediaQuery, useTheme } from '@mui/material';
import consolesData from '../../data/consoles.json';

export default function GameCard({ name, consoleAlias, onContextMenu }: { name: string; consoleAlias: string; onContextMenu?: (e: React.MouseEvent, game: { name: string; consoleAlias: string }) => void }) {
    const navigate = useNavigate();
    const consoleName = consolesData.find(console => console.alias === consoleAlias)?.name ?? '';
    const { cover, loading } = useSteamGridDB(consoleName, name);
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [mouse, setMouse] = useState({ x: 50, y: 50 });
    const [hovered, setHovered] = useState(false);

    if (!cover && loading) return null;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        setMouse({ x: nx * 100, y: ny * 100 });
        setRotation({ x: (ny - 0.5) * -25, y: (nx - 0.5) * 25 });
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = (touch.clientX - rect.left) / rect.width;
        const ny = (touch.clientY - rect.top) / rect.height;
        setMouse({ x: nx * 100, y: ny * 100 });
        setRotation({ x: (ny - 0.5) * -25, y: (nx - 0.5) * 25 });
        setHovered(true);
    };

    const handleTouchEnd = () => {
        setHovered(false);
        setRotation({ x: 0, y: 0 });
    };

    const stripeOffset = hovered ? (mouse.x - 50) * 0.6 : 0;
    const reflectAngle = 125;

    const hueShift = hovered ? (mouse.x - 50) * 1.8 : 0;

    const isEffectEnabled = localStorage.getItem('effect') === 'true';

    const fallbackCard = (
        <button
            type="button"
            onClick={() => navigate(`/${encodeURIComponent(consoleAlias)}/${encodeURIComponent(name)}`)}
            onContextMenu={isEffectEnabled ? undefined : (e) => onContextMenu?.(e, { name, consoleAlias })}
            style={{
                width: isTablet ? '158px' : '208px',
                height: isTablet ? '258px' : '308px',
                background: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                border: 'none',
                borderRadius: '4px',
                padding: '16px',
                font: 'inherit',
                fontSize: '1.1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                overflowWrap: 'anywhere',
                boxSizing: 'border-box',
                flexShrink: 0,
                cursor: 'pointer',
                ...(isEffectEnabled ? {
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transition: hovered ? 'transform 0.05s linear' : 'transform 0.35s ease',
                    boxShadow: hovered ? '0 20px 40px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.3)',
                    willChange: 'transform',
                } : {}),
            }}
        >
            {name}
        </button>
    );

    if (isEffectEnabled) {

    return (
        <div
            onContextMenu={(e) => onContextMenu && onContextMenu(e, { name, consoleAlias })}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setRotation({ x: 0, y: 0 }); setMouse({ x: 50, y: 50 }); }}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                perspective: '800px',
                cursor: 'pointer',
                borderRadius: '4px',
                position: 'relative',
                zIndex: hovered ? 10 : 1,
            }}
        >
            {cover ? <img
                src={cover}
                alt={name}
                onClick={() => navigate(`/${encodeURIComponent(consoleAlias)}/${encodeURIComponent(name)}`)}
                style={{
                    width: isTablet ? '158px' : '208px',
                    height: isTablet ? '258px' : '308px',
                    borderRadius: '4px',
                    display: 'block',
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transition: hovered ? 'transform 0.05s linear' : 'transform 0.35s ease',
                    boxShadow: hovered ? '0 20px 40px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.3)',
                    willChange: 'transform',
                }}
            /> : fallbackCard}

            {cover && <>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transition: hovered ? 'transform 0.05s linear' : 'transform 0.35s ease',
                    willChange: 'transform',
                    background: `repeating-linear-gradient(
                        ${reflectAngle}deg,
                        transparent 0%,
                        rgba(255,255,255,0.04) calc(${stripeOffset + 8}% + 0px),
                        rgba(255,255,255,0.09) calc(${stripeOffset + 10}% + 0px),
                        rgba(255,255,255,0.04) calc(${stripeOffset + 12}% + 0px),
                        transparent calc(${stripeOffset + 14}% + 0px),
                        transparent calc(${stripeOffset + 24}% + 0px)
                    )`,
                    mixBlendMode: 'screen',
                    opacity: 0.7,
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    opacity: hovered ? 0.55 : 0,
                    transition: hovered ? 'opacity 0.1s linear, transform 0.05s linear' : 'opacity 0.4s ease, transform 0.35s ease',
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    willChange: 'transform, opacity',
                    background: `
                        radial-gradient(ellipse at ${mouse.x}% ${mouse.y}%, rgba(255,255,255,0.22) 0%, transparent 50%),
                        repeating-linear-gradient(
                            ${reflectAngle}deg,
                            hsla(${hueShift + 0},  100%, 70%, 0.13) 0%,
                            hsla(${hueShift + 40}, 100%, 65%, 0.15) 8%,
                            hsla(${hueShift + 80}, 100%, 70%, 0.13) 16%,
                            hsla(${hueShift + 120},100%, 65%, 0.15) 24%,
                            hsla(${hueShift + 160},100%, 70%, 0.13) 32%,
                            hsla(${hueShift + 200},100%, 65%, 0.15) 40%,
                            hsla(${hueShift + 240},100%, 70%, 0.13) 48%,
                            hsla(${hueShift + 280},100%, 65%, 0.15) 56%,
                            hsla(${hueShift + 320},100%, 70%, 0.13) 64%,
                            hsla(${hueShift + 360},100%, 65%, 0.15) 72%
                        )
                    `,
                    mixBlendMode: 'color-dodge',
                }}
            />
            </>}
        </div>
    );
    }

    if (!cover) return fallbackCard;

    return (
        <img
            src={cover}
            alt={name}
            onContextMenu={(e) => onContextMenu?.(e, { name, consoleAlias })}
            onClick={() => navigate(`/${encodeURIComponent(consoleAlias)}/${encodeURIComponent(name)}`)}
            style={{ width: isTablet ? '158px' : '208px', cursor: 'pointer', borderRadius: '4px', display: 'block', height: isTablet ? '258px' : '308px' }}
        />
    );
}
