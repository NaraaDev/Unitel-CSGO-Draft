/**
 * 8 distinct tactical-operator SVG avatars.
 * Each is rendered inline (no network calls). The `Avatar` component picks one by
 * `avatarId` (0..7). They share a 64x64 viewBox so callers control sizing via CSS.
 */

interface AvatarPalette {
  bg: string;
  fg: string;
  accent: string;
  glow: string;
}

const PALETTES: AvatarPalette[] = [
  { bg: "#1a0f08", fg: "#f5f5f7", accent: "#ff6b00", glow: "rgba(255,107,0,0.6)" },
  { bg: "#08151a", fg: "#f5f5f7", accent: "#00d4ff", glow: "rgba(0,212,255,0.6)" },
  { bg: "#1a0808", fg: "#f5f5f7", accent: "#ef4444", glow: "rgba(239,68,68,0.6)" },
  { bg: "#081a0d", fg: "#f5f5f7", accent: "#22c55e", glow: "rgba(34,197,94,0.6)" },
  { bg: "#1a1808", fg: "#f5f5f7", accent: "#f5a623", glow: "rgba(245,166,35,0.6)" },
  { bg: "#150818", fg: "#f5f5f7", accent: "#a855f7", glow: "rgba(168,85,247,0.6)" },
  { bg: "#0a0a0a", fg: "#f5f5f7", accent: "#fafafa", glow: "rgba(250,250,250,0.5)" },
  { bg: "#180814", fg: "#f5f5f7", accent: "#ec4899", glow: "rgba(236,72,153,0.6)" },
];

type DrawingFn = (p: AvatarPalette) => React.ReactNode;

// Shape 1 — Helmet + visor
const draw0: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <path d="M16 28 Q16 14 32 14 Q48 14 48 28 L48 38 L16 38 Z" fill={p.accent} />
    <rect x="20" y="30" width="24" height="6" fill={p.bg} />
    <rect x="22" y="32" width="20" height="2" fill={p.accent} />
    <path d="M16 38 L48 38 L48 46 L40 46 L40 52 L24 52 L24 46 L16 46 Z" fill={p.fg} opacity="0.85" />
  </>
);

// Shape 2 — Skull mask balaclava
const draw1: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <ellipse cx="32" cy="36" rx="18" ry="22" fill={p.fg} />
    <circle cx="25" cy="32" r="4" fill={p.bg} />
    <circle cx="39" cy="32" r="4" fill={p.bg} />
    <rect x="22" y="44" width="20" height="3" fill={p.bg} />
    <rect x="24" y="48" width="3" height="3" fill={p.bg} />
    <rect x="29.5" y="48" width="3" height="3" fill={p.bg} />
    <rect x="35" y="48" width="3" height="3" fill={p.bg} />
    <rect x="14" y="20" width="36" height="2" fill={p.accent} />
  </>
);

// Shape 3 — Crosshair scope
const draw2: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <circle cx="32" cy="32" r="22" fill="none" stroke={p.accent} strokeWidth="2" />
    <circle cx="32" cy="32" r="14" fill="none" stroke={p.fg} strokeWidth="1" opacity="0.6" />
    <line x1="32" y1="6" x2="32" y2="22" stroke={p.accent} strokeWidth="2" />
    <line x1="32" y1="42" x2="32" y2="58" stroke={p.accent} strokeWidth="2" />
    <line x1="6" y1="32" x2="22" y2="32" stroke={p.accent} strokeWidth="2" />
    <line x1="42" y1="32" x2="58" y2="32" stroke={p.accent} strokeWidth="2" />
    <circle cx="32" cy="32" r="3" fill={p.fg} />
  </>
);

// Shape 4 — Hexagon shield
const draw3: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill={p.accent} opacity="0.95" />
    <polygon points="32,16 47,24 47,40 32,48 17,40 17,24" fill={p.bg} />
    <polygon points="32,22 42,28 42,38 32,44 22,38 22,28" fill={p.fg} />
    <text
      x="32"
      y="38"
      textAnchor="middle"
      fontFamily="Impact, sans-serif"
      fontSize="14"
      fontWeight="700"
      fill={p.bg}
    >
      OP
    </text>
  </>
);

// Shape 5 — Knife / blade
const draw4: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <polygon points="20,12 44,12 44,16 32,52 28,52 16,16 16,12" fill={p.fg} />
    <polygon points="22,16 42,16 42,18 32,46 30,46 22,18" fill={p.accent} />
    <rect x="26" y="48" width="12" height="6" fill={p.fg} />
    <rect x="27" y="49" width="10" height="4" fill={p.bg} />
  </>
);

// Shape 6 — Bullet/target rings
const draw5: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <circle cx="32" cy="32" r="26" fill={p.fg} />
    <circle cx="32" cy="32" r="20" fill={p.bg} />
    <circle cx="32" cy="32" r="14" fill={p.accent} />
    <circle cx="32" cy="32" r="8" fill={p.bg} />
    <circle cx="32" cy="32" r="3" fill={p.accent} />
  </>
);

// Shape 7 — Radio / signal
const draw6: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <rect x="22" y="20" width="20" height="32" fill={p.fg} />
    <rect x="24" y="22" width="16" height="10" fill={p.accent} />
    <circle cx="28" cy="38" r="2" fill={p.bg} />
    <circle cx="36" cy="38" r="2" fill={p.bg} />
    <circle cx="28" cy="44" r="2" fill={p.bg} />
    <circle cx="36" cy="44" r="2" fill={p.bg} />
    <line x1="28" y1="20" x2="22" y2="10" stroke={p.fg} strokeWidth="2" />
    <line x1="36" y1="20" x2="42" y2="10" stroke={p.fg} strokeWidth="2" />
    <circle cx="22" cy="10" r="3" fill={p.accent} />
    <circle cx="42" cy="10" r="3" fill={p.accent} />
  </>
);

// Shape 8 — Lightning bolt
const draw7: DrawingFn = (p) => (
  <>
    <rect x="0" y="0" width="64" height="64" fill={p.bg} />
    <polygon
      points="34,6 18,34 28,34 22,58 46,28 36,28 42,6"
      fill={p.accent}
      stroke={p.fg}
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <circle cx="14" cy="14" r="2" fill={p.fg} opacity="0.6" />
    <circle cx="52" cy="50" r="2" fill={p.fg} opacity="0.6" />
  </>
);

const DRAWINGS: DrawingFn[] = [draw0, draw1, draw2, draw3, draw4, draw5, draw6, draw7];

export const AVATAR_COUNT = DRAWINGS.length;

export function Avatar({
  id,
  size = 40,
  className = "",
  active = false,
}: {
  id: number;
  size?: number;
  className?: string;
  active?: boolean;
}) {
  const safeId = ((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const palette = PALETTES[safeId];
  const draw = DRAWINGS[safeId];
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block",
          border: `1px solid ${active ? palette.accent : "rgba(58,58,71,0.7)"}`,
          boxShadow: active ? `0 0 12px ${palette.glow}` : "none",
          clipPath:
            "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
          background: palette.bg,
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
      >
        {draw(palette)}
      </svg>
    </span>
  );
}

export const PALETTE_FOR = (id: number) =>
  PALETTES[((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT];
