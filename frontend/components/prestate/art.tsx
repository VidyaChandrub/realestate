import { useId } from "react";

type Palette = { skyTop: string; skyMid: string; skyLow: string; glow: string; tower: string; towerDark: string };

// Deterministic pseudo-randomness so server & client render identical SVG.
function dither(row: number, col: number, mod = 10, threshold = 6): boolean {
  return (row * 7 + col * 13) % mod < threshold;
}

const DUSK: Palette = {
  skyTop: "#0d1120",
  skyMid: "#2a2350",
  skyLow: "#6d5dfc",
  glow: "#cda45e",
  tower: "#151b30",
  towerDark: "#0e1324",
};

// Shared twilight sky background + gradient ids
function Sky({ palette }: { palette: Palette }) {
  const id = useId();
  return (
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={palette.skyTop} />
        <stop offset="55%" stopColor={palette.skyMid} />
        <stop offset="100%" stopColor={palette.skyLow} />
      </linearGradient>
      <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor={palette.glow} stopOpacity="0.9" />
        <stop offset="60%" stopColor={palette.glow} stopOpacity="0.35" />
        <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-tower`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={palette.towerDark} />
        <stop offset="50%" stopColor={palette.tower} />
        <stop offset="100%" stopColor={palette.towerDark} />
      </linearGradient>
    </defs>
  );
}

function Tower({
  x,
  w,
  h,
  base,
  palette,
  windows,
  roof,
}: {
  x: number;
  w: number;
  h: number;
  base: number;
  palette: Palette;
  windows?: boolean;
  roof?: "flat" | "spire";
}) {
  const id = useId();
  const rows = Math.max(4, Math.floor(h / 26));
  const cols = Math.max(2, Math.floor(w / 16));
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} fill={`url(#${id}-tw)`} rx="2" />
      <defs>
        <linearGradient id={`${id}-tw`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={palette.towerDark} />
          <stop offset="42%" stopColor={palette.tower} />
          <stop offset="100%" stopColor={palette.towerDark} />
        </linearGradient>
      </defs>
      {roof === "spire" ? (
        <path d={`M ${x + w / 2 - 10} ${base - h} L ${x + w / 2} ${base - h - 42} L ${x + w / 2 + 10} ${base - h}`} fill={palette.towerDark} />
      ) : (
        <rect x={x - 3} y={base - h - 8} width={w + 6} height={10} rx="2" fill={palette.towerDark} />
      )}
      {windows
        ? Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => (
              <rect
                key={`${r}-${c}`}
                x={x + 8 + c * 15}
                y={base - h + 12 + r * 24}
                width="6"
                height="9"
                rx="1"
                fill={dither(r, c, 10, 6) ? palette.glow : palette.skyTop}
                opacity={dither(r, c + 3, 10, 7) ? 0.95 : 0.45}
              />
            )),
          )
        : null}
    </g>
  );
}

export function HeroScene({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <Sky palette={DUSK} />
      <rect width="1200" height="760" fill={`url(#${id}-sky)`} />
      <circle cx="860" cy="430" r="230" fill={`url(#${id}-sun)`} />
      <circle cx="860" cy="430" r="46" fill={DUSK.glow} opacity="0.95" />
      {/* distant skyline */}
      <rect x="0" y="470" width="1200" height="290" fill={DUSK.towerDark} opacity="0.5" />
      <Tower x={120} w={70} h={150} base={560} palette={DUSK} roof="flat" />
      <Tower x={240} w={90} h={190} base={560} palette={DUSK} roof="spire" windows />
      <Tower x={420} w={110} h={240} base={560} palette={DUSK} roof="spire" windows />
      <Tower x={610} w={150} h={330} base={560} palette={DUSK} roof="flat" windows />
      <Tower x={830} w={120} h={210} base={560} palette={DUSK} roof="spire" windows />
      <Tower x={1000} w={80} h={150} base={560} palette={DUSK} roof="flat" />
      {/* main tower pair */}
      <Tower x={520} w={170} h={410} base={660} palette={DUSK} roof="spire" windows />
      <Tower x={705} w={170} h={410} base={660} palette={DUSK} roof="spire" windows />
      {/* podium + ground */}
      <rect x="420" y="640" width="480" height="120" rx="6" fill="#10152a" />
      <rect x="520" y="660" width="330" height="100" rx="4" fill="#171d36" />
      <rect x="0" y="660" width="1200" height="100" fill="#0b0f1f" />
      {/* trees */}
      <g opacity="0.9">
        <circle cx="120" cy="648" r="26" fill="#0e2a24" />
        <rect x="117" y="648" width="6" height="22" fill="#0a0f1c" />
        <circle cx="1120" cy="650" r="24" fill="#0e2a24" />
        <rect x="1117" y="650" width="6" height="20" fill="#0a0f1c" />
        <circle cx="1080" cy="655" r="18" fill="#123228" />
        <rect x="1077" y="655" width="5" height="16" fill="#0a0f1c" />
      </g>
    </svg>
  );
}

export function InteriorScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="int-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe9dc" />
          <stop offset="100%" stopColor="#e4dcc9" />
        </linearGradient>
        <linearGradient id="int-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a7b52" />
          <stop offset="100%" stopColor="#7c5f3c" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="#f2ecdf" />
      {/* window */}
      <rect x="40" y="40" width="560" height="210" rx="8" fill="#b8c4d8" />
      <rect x="40" y="40" width="560" height="210" rx="8" fill="url(#hero-sky)" opacity="0.55" />
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2350" />
          <stop offset="100%" stopColor="#cda45e" />
        </linearGradient>
      </defs>
      <rect x="44" y="44" width="552" height="202" rx="6" fill="none" stroke="#d8cfb8" strokeWidth="3" />
      <rect x="316" y="40" width="8" height="210" fill="#e8e0cc" />
      <rect x="40" y="120" width="560" height="8" fill="#e8e0cc" />
      {/* sofa */}
      <rect x="120" y="300" width="250" height="70" rx="14" fill="#6d5dfc" />
      <rect x="120" y="300" width="250" height="40" rx="14" fill="#7a6bff" />
      <rect x="105" y="340" width="280" height="30" rx="10" fill="#5a4be0" />
      <rect x="250" y="330" width="60" height="40" rx="8" fill="#8a7bff" />
      {/* coffee table */}
      <rect x="420" y="340" width="150" height="14" rx="4" fill="#b08a3e" />
      <rect x="460" y="354" width="8" height="26" fill="#8a6a2f" />
      <rect x="522" y="354" width="8" height="26" fill="#8a6a2f" />
      {/* rug + floor */}
      <ellipse cx="320" cy="382" rx="230" ry="26" fill="#6d5dfc" opacity="0.18" />
      <rect y="368" width="640" height="52" fill="url(#int-floor)" />
      {/* lamp */}
      <path d="M520 160 L512 300" stroke="#c9b98f" strokeWidth="5" />
      <path d="M500 160 q20 -26 40 0 z" fill="#cda45e" />
    </svg>
  );
}

export function PoolScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="pool-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2040" />
          <stop offset="70%" stopColor="#5a4be0" />
          <stop offset="100%" stopColor="#cda45e" />
        </linearGradient>
        <linearGradient id="pool-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f7be8" />
          <stop offset="100%" stopColor="#6d5dfc" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#pool-sky)" />
      <circle cx="520" cy="180" r="60" fill="#cda45e" opacity="0.8" />
      <rect x="80" y="150" width="480" height="200" rx="18" fill="url(#pool-water)" opacity="0.9" />
      <rect x="80" y="150" width="480" height="200" rx="18" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="5" />
      <path d="M80 240 q40 -14 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" fill="none" />
      <path d="M80 300 q40 -14 80 0 t80 0 t80 0 t80 0 t80 0 t80 0" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      {/* loungers */}
      <rect x="120" y="130" width="90" height="8" rx="4" fill="#ffffff" opacity="0.85" />
      <rect x="150" y="132" width="40" height="24" rx="6" fill="#ffffff" opacity="0.9" />
      <rect x="420" y="360" width="90" height="8" rx="4" fill="#ffffff" opacity="0.7" />
      <rect x="450" y="350" width="40" height="18" rx="6" fill="#ffffff" opacity="0.75" />
      {/* umbrella */}
      <path d="M200 60 q20 40 40 70 h-80 q20 -30 40 -70" fill="#cda45e" opacity="0.9" />
      <rect x="238" y="130" width="5" height="60" fill="#8a6a2f" />
      <rect x="0" y="360" width="640" height="60" fill="#11142b" />
    </svg>
  );
}

export function GardenScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="gdn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d2340" />
          <stop offset="100%" stopColor="#3c3563" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#gdn-sky)" />
      <rect y="200" width="640" height="220" fill="#123228" />
      <rect y="210" width="640" height="210" fill="#0e2a24" />
      <ellipse cx="320" cy="230" rx="300" ry="70" fill="#143a2c" />
      <path d="M0 250 Q160 210 320 250 T640 250 V420 H0 Z" fill="#0b241d" />
      <g opacity="0.9">
        {[60, 150, 240, 340, 450, 540].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={210 - (i % 2) * 18} r={i % 2 ? 26 : 34} fill={i % 2 ? "#1a4a34" : "#1f563c"} />
            <circle cx={x} cy={212 - (i % 2) * 18} r={i % 2 ? 16 : 20} fill={i % 2 ? "#26704b" : "#2c8156"} />
            <rect x={x - 4} y={214} width="8" height={26} fill="#7c5f3c" />
          </g>
        ))}
      </g>
      <rect x="120" y="330" width="400" height="16" rx="8" fill="#c9b98f" />
      <rect x="520" y="80" width="60" height="140" rx="4" fill="#171d36" />
      <rect x="524" y="84" width="8" height="10" fill="#cda45e" />
      <rect x="536" y="84" width="8" height="10" fill="#cda45e" />
      <rect x="548" y="84" width="8" height="10" fill="#cda45e" />
      <rect x="524" y="100" width="8" height="10" fill="#cda45e" />
      <rect x="536" y="100" width="8" height="10" fill="#cda45e" />
      <rect x="548" y="100" width="8" height="10" fill="#cda45e" />
    </svg>
  );
}

export function LobbyScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="lobby-h" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2547" />
          <stop offset="100%" stopColor="#4a3f72" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="#1b1730" />
      <polygon points="0,0 640,0 640,300 0,420" fill="url(#lobby-h)" />
      <rect x="220" y="40" width="200" height="200" rx="6" fill="#0f0d1e" />
      <rect x="230" y="50" width="180" height="180" rx="4" fill="#cda45e" opacity="0.9" />
      <rect x="230" y="50" width="180" height="180" rx="4" fill="#1b1730" opacity="0.4" />
      <rect x="315" y="50" width="10" height="180" fill="#0f0d1e" opacity="0.55" />
      <rect x="230" y="120" width="180" height="10" fill="#0f0d1e" opacity="0.55" />
      <rect x="260" y="300" width="160" height="60" rx="8" fill="#3a2f22" />
      <rect x="260" y="300" width="160" height="40" rx="8" fill="#4b3d2c" />
      <rect x="0" y="350" width="640" height="70" fill="#121024" />
      <rect x="0" y="352" width="640" height="6" fill="#cda45e" opacity="0.5" />
    </svg>
  );
}

export function TowerScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <Sky palette={DUSK} />
      <defs>
        <linearGradient id="tt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#141a30" />
          <stop offset="100%" stopColor="#4c3f9e" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#tt-sky)" />
      <circle cx="540" cy="190" r="70" fill="#cda45e" opacity="0.7" />
      <rect x="220" y="120" width="200" height="280" rx="4" fill="#151b30" />
      <rect x="204" y="112" width="232" height="12" rx="3" fill="#0e1324" />
      {Array.from({ length: 10 }).map((_, r) =>
        Array.from({ length: 5 }).map((_, c) => (
          <rect key={`${r}-${c}`} x={230 + c * 34} y={140 + r * 24} width="16" height="9" rx="1.5" fill={dither(r, c, 10, 7) ? "#cda45e" : "#0e1324"} opacity={dither(r, c + 2, 10, 7) ? 0.9 : 0.4} />
        )),
      )}
      <rect x="240" y="356" width="160" height="64" rx="3" fill="#1b2240" />
      <rect x="0" y="396" width="640" height="24" fill="#0b0f1f" />
    </svg>
  );
}

export function TourScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <Sky palette={DUSK} />
      <defs>
        <linearGradient id="tour-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10152b" />
          <stop offset="100%" stopColor="#5a4be0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="560" fill="url(#tour-sky)" />
      <circle cx="880" cy="300" r="120" fill="#cda45e" opacity="0.6" />
      <Tower x={380} w={180} h={300} base={520} palette={DUSK} roof="spire" windows />
      <Tower x={590} w={180} h={300} base={520} palette={DUSK} roof="spire" windows />
      <rect x="340" y="500" width="470" height="60" rx="6" fill="#141a30" />
      <rect x="0" y="520" width="1200" height="40" fill="#0a0f1c" />
    </svg>
  );
}

export function OverviewScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 720 520" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <Sky palette={DUSK} />
      <defs>
        <linearGradient id="ov-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10152b" />
          <stop offset="100%" stopColor="#5a4be0" />
        </linearGradient>
      </defs>
      <rect width="720" height="520" fill="url(#ov-sky)" />
      <circle cx="560" cy="260" r="100" fill="#cda45e" opacity="0.65" />
      <Tower x={150} w={110} h={220} base={460} palette={DUSK} roof="spire" windows />
      <Tower x={280} w={130} h={280} base={460} palette={DUSK} roof="spire" windows />
      <Tower x={440} w={110} h={200} base={460} palette={DUSK} roof="flat" windows />
      <rect x="120" y="440" width="470" height="80" rx="6" fill="#141a30" />
      <rect x="0" y="480" width="720" height="40" fill="#0a0f1c" />
      <g>
        <circle cx="90" cy="448" r="20" fill="#1a4a34" />
        <rect x="87" y="448" width="6" height="18" fill="#0a0f1c" />
        <circle cx="650" cy="452" r="18" fill="#1a4a34" />
        <rect x="647" y="452" width="6" height="16" fill="#0a0f1c" />
      </g>
    </svg>
  );
}

export function PlanScene({ beds = "3", className }: { beds?: string; className?: string }) {
  const w = 640;
  const h = 420;
  const wall = "#d8cfb8";
  const wallW = 6;
  const fill = "#f3eee2";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className={className} style={{ width: "100%", height: "100%", background: "#faf7f0" }}>
      {/* outer wall */}
      <rect x="20" y="20" width={w - 40} height={h - 40} fill={fill} stroke={wall} strokeWidth={wallW} rx="6" />
      {/* door symbols */}
      <path d="M20 260 A48 48 0 0 1 68 212 L68 260 Z" fill={fill} stroke={wall} strokeWidth="3" />
      <path d={`M${w - 20} 300 A48 48 0 0 0 ${w - 68} 348 L${w - 68} 300 Z`} fill={fill} stroke={wall} strokeWidth="3" />
      {/* interior walls */}
      <line x1="300" y1="20" x2="300" y2={h - 20} stroke={wall} strokeWidth={wallW - 2} />
      <line x1="300" y1="250" x2={w - 20} y2="250" stroke={wall} strokeWidth={wallW - 2} />
      <line x1="20" y1="250" x2="300" y2="250" stroke={wall} strokeWidth={wallW - 2} />
      {/* windows on outer wall */}
      <rect x="90" y="14" width="120" height="12" fill="#b8c4d8" stroke={wall} strokeWidth="3" />
      <rect x="420" y={h - 26} width="120" height="12" fill="#b8c4d8" stroke={wall} strokeWidth="3" />
      <rect x="14" y="120" width="12" height="110" fill="#b8c4d8" stroke={wall} strokeWidth="3" />
      {/* room labels */}
      <text x="160" y="150" textAnchor="middle" fontSize="15" fontWeight="600" fill="#7a6b5a">LIVING</text>
      <text x="160" y="170" textAnchor="middle" fontSize="12" fill="#a89b85">+ DINING</text>
      <text x="150" y="350" textAnchor="middle" fontSize="15" fontWeight="600" fill="#7a6b5a">BEDROOM</text>
      <text x="470" y="150" textAnchor="middle" fontSize="15" fontWeight="600" fill="#7a6b5a">KITCHEN</text>
      <text x="470" y="350" textAnchor="middle" fontSize="15" fontWeight="600" fill="#7a6b5a">BEDROOM</text>
      <text x="520" y="90" fontSize="11" fill="#a89b85">MASTER {beds}-BHK · 1,650 sq.ft</text>
    </svg>
  );
}

export function MapScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <rect width="640" height="420" fill="#eef1f6" />
      {/* roads */}
      <g stroke="#ffffff" strokeWidth="14">
        <path d="M-20 120 L660 90" />
        <path d="M-20 300 L660 330" />
        <path d="M180 -20 L160 440" />
        <path d="M480 -20 L500 440" />
        <path d="M90 -20 L70 440" />
      </g>
      <g stroke="#e3e7ef" strokeWidth="4">
        <path d="M-20 120 L660 90" />
        <path d="M-20 300 L660 330" />
        <path d="M180 -20 L160 440" />
        <path d="M480 -20 L500 440" />
        <path d="M90 -20 L70 440" />
      </g>
      {/* blocks */}
      <g fill="#dfe4ee">
        <rect x="210" y="30" width="60" height="50" rx="6" />
        <rect x="290" y="30" width="60" height="50" rx="6" />
        <rect x="210" y="160" width="60" height="50" rx="6" />
        <rect x="290" y="160" width="60" height="50" rx="6" />
        <rect x="210" y="340" width="60" height="50" rx="6" />
        <rect x="290" y="340" width="60" height="50" rx="6" />
        <rect x="520" y="160" width="60" height="50" rx="6" />
      </g>
      {/* water */}
      <path d="M520 40 q30 30 20 60 q-10 30 20 60 q30 30 10 70 q-20 40 10 80" stroke="#c9d8ea" strokeWidth="30" fill="none" strokeLinecap="round" />
      {/* park */}
      <ellipse cx="120" cy="250" rx="46" ry="34" fill="#d5e6d0" />
      {/* markers */}
      <g>
        <g transform="translate(500 330)">
          <path d="M0 -26 C -16 -26 -22 -10 -22 2 C -22 14 0 28 0 28 C 0 28 22 14 22 2 C 22 -10 16 -26 0 -26 Z" fill="#6d5dfc" />
          <circle cx="0" cy="0" r="8" fill="#ffffff" />
        </g>
        <g transform="translate(160 60)">
          <circle r="9" fill="#cda45e" stroke="#ffffff" strokeWidth="3" />
        </g>
        <g transform="translate(480 140)">
          <circle r="9" fill="#cda45e" stroke="#ffffff" strokeWidth="3" />
        </g>
        <g transform="translate(300 60)">
          <circle r="9" fill="#cda45e" stroke="#ffffff" strokeWidth="3" />
        </g>
      </g>
      <rect x="410" y="300" width="90" height="26" rx="8" fill="#ffffff" stroke="#e3e7ef" />
      <text x="455" y="318" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6d5dfc">AURORA</text>
    </svg>
  );
}

export function SceneImage({ art, className, beds }: { art: string; className?: string; beds?: string }) {
  switch (art) {
    case "hero":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/prestate/hero-aurora.jpg"
          alt="Aurora Residences — night view of luxury twin towers"
          className={className}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      );
    case "overview":
      return <OverviewScene className={className} />;
    case "pool":
      return <PoolScene className={className} />;
    case "lobby":
      return <LobbyScene className={className} />;
    case "tower":
      return <TowerScene className={className} />;
    case "garden":
      return <GardenScene className={className} />;
    case "interior":
      return <InteriorScene className={className} />;
    case "tour":
      return <TourScene className={className} />;
    case "map":
      return <MapScene className={className} />;
    case "villa":
      return <VillaScene className={className} />;
    case "plots":
      return <PlotsScene className={className} />;
    case "rental":
      return <RentalScene className={className} />;
    case "agent":
      return <AgentScene className={className} />;
    case "expo":
      return <ExpoScene className={className} />;
    case "commercial":
      return <CommercialScene className={className} />;
    default:
      return beds ? <PlanScene beds={beds} className={className} /> : <HeroScene className={className} />;
  }
}

function VillaScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="vl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bde3f7" />
          <stop offset="100%" stopColor="#eaf6fd" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#vl-sky)" />
      <rect y="300" width="640" height="120" fill="#b7cfb0" />
      <polygon points="220,120 400,120 400,120 420,100 460,100 460,120 470,120 470,120 470,300 180,300 180,150 200,130 220,120" fill="#f6f1e6" />
      <rect x="180" y="150" width="290" height="150" fill="#f6f1e6" />
      <polygon points="180,150 320,60 470,150" fill="#d94f3d" />
      <rect x="250" y="210" width="70" height="90" fill="#b98a5a" />
      <rect x="350" y="200" width="56" height="60" rx="3" fill="#9fc5e8" />
      <rect x="350" y="260" width="56" height="40" fill="#b98a5a" />
      <rect x="200" y="200" width="40" height="36" rx="2" fill="#9fc5e8" />
      <circle cx="300" cy="150" r="10" fill="#f6f1e6" stroke="#d94f3d" strokeWidth="2" />
    </svg>
  );
}

function PlotsScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <rect width="640" height="420" fill="#eef2e4" />
      <g stroke="#d6dfc6" strokeWidth="3">
        <line x1="140" y1="20" x2="140" y2="400" />
        <line x1="280" y1="20" x2="280" y2="400" />
        <line x1="420" y1="20" x2="420" y2="400" />
        <line x1="20" y1="150" x2="620" y2="150" />
        <line x1="20" y1="290" x2="620" y2="290" />
      </g>
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={26 + (i % 4) * 140} y={30 + Math.floor(i / 4) * 140} width="100" height="95" rx="6" fill="#ffffff" stroke="#cbd8b8" strokeWidth="2" />
      ))}
      <g transform="translate(320 50)">
        <circle r="8" fill="#6d5dfc" stroke="#ffffff" strokeWidth="2" />
        <text y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6d5dfc">PLOT 14</text>
      </g>
    </svg>
  );
}

function RentalScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="rt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4a66" />
          <stop offset="100%" stopColor="#8fa6c0" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#rt-sky)" />
      <rect x="120" y="90" width="400" height="290" fill="#d6c7a8" />
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 6 }).map((_, c) => (
          <rect key={`${r}-${c}`} x={140 + c * 62} y={110 + r * 66} width="42" height="34" rx="2" fill="#aec9e2" />
        )),
      )}
      <rect x="120" y="90" width="400" height="290" fill="none" stroke="#c8bfa6" strokeWidth="2" />
      <rect x="0" y="380" width="640" height="40" fill="#2c3a52" />
    </svg>
  );
}

function AgentScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="ag-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b2547" />
          <stop offset="100%" stopColor="#6d5dfc" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#ag-sky)" />
      <rect x="220" y="60" width="200" height="260" rx="100" fill="#e8e2d4" />
      <circle cx="320" cy="150" r="54" fill="#d9cfb8" />
      <rect x="240" y="150" width="160" height="170" rx="60" fill="#cda45e" />
      <rect x="250" y="150" width="140" height="170" fill="#b08a3e" opacity="0.5" />
      <rect x="0" y="380" width="640" height="40" fill="#141a30" />
    </svg>
  );
}

function ExpoScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="ex-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1730" />
          <stop offset="100%" stopColor="#7c3a6e" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#ex-sky)" />
      <rect x="120" y="120" width="400" height="220" fill="#262040" />
      <polygon points="120,120 320,40 520,120" fill="#cda45e" opacity="0.9" />
      <rect x="320" y="40" width="8" height="80" fill="#8a6a2f" />
      <rect x="150" y="220" width="120" height="120" fill="#db2777" opacity="0.85" />
      <rect x="290" y="220" width="120" height="120" fill="#6d5dfc" opacity="0.9" />
      <rect x="430" y="220" width="100" height="120" fill="#cda45e" opacity="0.9" />
      <text x="320" y="285" textAnchor="middle" fontSize="16" fontWeight="800" fill="#ffffff">EXPO</text>
      <rect x="0" y="380" width="640" height="40" fill="#161226" />
    </svg>
  );
}

function CommercialScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" className={className} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="cm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22304a" />
          <stop offset="100%" stopColor="#5b7bab" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#cm-sky)" />
      <rect x="160" y="120" width="320" height="260" fill="#3a4f6e" />
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 6 }).map((_, c) => (
          <rect key={`${r}-${c}`} x={180 + c * 48} y={140 + r * 44} width="30" height="20" rx="2" fill="#8fd0f0" opacity={dither(r, c + 4, 10, 7) ? 0.9 : 0.4} />
        )),
      )}
      <rect x="160" y="120" width="320" height="14" fill="#2c3f5c" />
      <rect x="0" y="380" width="640" height="40" fill="#1a2740" />
    </svg>
  );
}