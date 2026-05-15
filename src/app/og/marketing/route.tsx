import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/* ────────────────────────────────────────────────────────────────────
   Dynamic marketing asset generator. "Signal Static" design system.
   Renders PNG cards via @vercel/og (satori).

   Usage:
     /og/marketing?variant=square&scene=hero
     /og/marketing?variant=og&scene=multistream
     /og/marketing?variant=story&scene=ai-cohost
     /og/marketing?variant=banner&scene=beta

   Optional overrides: ?title=&accent=&kicker=&sub=

   Design philosophy: docs/design/philosophy.md
   Token reference:   docs/styleguide.md

   NOTE on color: satori does not fully support oklch() yet. Hex
   equivalents below mirror globals.css @theme tokens — keep in sync.
   ──────────────────────────────────────────────────────────────────── */

const C = {
  surface: "#080808",
  surface1: "#171717",
  surface2: "#262626",
  brand: "#6366f1",
  brandSoft: "#818cf8",
  brandSofter: "#a5b4fc",
  brandOnLight: "#e0e7ff",
  accentPurple: "#c084fc",
  accentBlue: "#60a5fa",
  inkStrong: "#ffffff",
  inkEmphasis: "#d4d4d4",
  inkMuted: "#a3a3a3",
  inkSubtle: "#737373",
  inkFaint: "#525252",
  inkFainter: "#404040",
  danger: "#ef4444",
} as const;

type VariantId =
  | "square"
  | "og"
  | "story"
  | "banner"
  | "portrait"
  | "ph-thumb"
  | "ph-gallery";
const VARIANTS: Record<VariantId, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  og: { w: 1200, h: 630 },
  story: { w: 1080, h: 1920 },
  banner: { w: 1500, h: 500 },
  portrait: { w: 1080, h: 1350 },
  "ph-thumb": { w: 240, h: 240 },
  "ph-gallery": { w: 1270, h: 760 },
};

type SceneId =
  | "hero"
  | "multistream"
  | "ai-cohost"
  | "browser"
  | "beta"
  | "quote"
  | "ph-launch"
  | "ph-maker";

type SceneDef = {
  index: string; // "01" .. "06" badge
  kicker: string;
  title: string;
  titleAccent: string;
  sub: string;
};

const SCENES: Record<SceneId, SceneDef> = {
  hero: {
    index: "01",
    kicker: "Private Beta",
    title: "Don't just stream.",
    titleAccent: "Co-host with AI.",
    sub: "Browser-native multistream studio. AI Co-Host runs your chat in your voice.",
  },
  multistream: {
    index: "02",
    kicker: "Multistream",
    title: "One tab.",
    titleAccent: "Four platforms.",
    sub: "YouTube · Twitch · Kick · TikTok. Plus custom RTMP. Zero downloads.",
  },
  "ai-cohost": {
    index: "03",
    kicker: "AI Co-Host",
    title: "Your voice.",
    titleAccent: "On autopilot.",
    sub: "Replies to viewers, answers FAQs, acknowledges subs — while you stay on content.",
  },
  browser: {
    index: "04",
    kicker: "Browser-Native",
    title: "No OBS.",
    titleAccent: "No hardware.",
    sub: "The whole production runs in a single browser tab.",
  },
  beta: {
    index: "05",
    kicker: "Apply Today",
    title: "Private Beta —",
    titleAccent: "now open.",
    sub: "Early access to the browser-native streaming studio.",
  },
  quote: {
    index: "06",
    kicker: "For creators",
    title: "“A three-person job",
    titleAccent: "you're doing alone.”",
    sub: "Zerocast — run a live show end-to-end, solo.",
  },
  "ph-launch": {
    index: "PH",
    kicker: "Live on Product Hunt",
    title: "Today on PH.",
    titleAccent: "Hunt with us.",
    sub: "Browser-native multistream studio + AI Co-Host. Upvotes welcome.",
  },
  "ph-maker": {
    index: "PH",
    kicker: "From the maker",
    title: "Built for solo",
    titleAccent: "live shows.",
    sub: "— Avi, founder. Three years streaming. One year building this.",
  },
};

function isVariant(v: string | null): v is VariantId {
  return v !== null && v in VARIANTS;
}
function isScene(s: string | null): s is SceneId {
  return s !== null && s in SCENES;
}

/* ── ATMOSPHERE ─────────────────────────────────────────────────────
   Layered behind every scene: brand glow, scanlines, hairline border.
   ──────────────────────────────────────────────────────────────────── */

function Atmosphere({ w, h }: { w: number; h: number }) {
  const glowSize = Math.max(w, h) * 1.3;
  return (
    <>
      {/* brand glow — top-right bloom */}
      <div
        style={{
          position: "absolute",
          top: -glowSize * 0.45,
          right: -glowSize * 0.25,
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.brand}40 0%, ${C.brand}10 30%, transparent 60%)`,
        }}
      />
      {/* secondary cool wash — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: -glowSize * 0.55,
          left: -glowSize * 0.3,
          width: glowSize * 0.9,
          height: glowSize * 0.9,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accentPurple}18 0%, transparent 55%)`,
        }}
      />
      {/* scanline whisper — horizontal lines, very low opacity */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, ${C.inkFainter}10 2px, ${C.inkFainter}10 3px)`,
          mixBlendMode: "screen",
          opacity: 0.4,
        }}
      />
      {/* hairline frame */}
      <div
        style={{
          position: "absolute",
          inset: Math.round(Math.min(w, h) * 0.025),
          border: `1px solid ${C.inkFainter}`,
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/* ── BUILDING BLOCKS ───────────────────────────────────────────────── */

function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.5 }}>
      <div
        style={{
          width: size * 1.25,
          height: size * 1.25,
          borderRadius: size * 0.3,
          background: C.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.inkStrong,
          fontSize: size * 0.72,
          fontWeight: 900,
          letterSpacing: -1,
          boxShadow: `0 0 ${size * 0.8}px ${C.brand}55`,
        }}
      >
        Z
      </div>
      <div
        style={{
          color: C.inkStrong,
          fontSize: size,
          fontWeight: 800,
          letterSpacing: -0.5,
        }}
      >
        zerocast
      </div>
    </div>
  );
}

function StatusPill({ text, size = 14 }: { text: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.7,
        padding: `${size * 0.55}px ${size * 1.15}px`,
        border: `1px solid ${C.brand}50`,
        borderRadius: 999,
        color: C.brandSoft,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: size * 0.2,
        textTransform: "uppercase",
        background: `${C.brand}10`,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: size * 0.48,
          height: size * 0.48,
          borderRadius: "50%",
          background: C.brandSoft,
          boxShadow: `0 0 ${size * 0.6}px ${C.brandSoft}`,
        }}
      />
      {text}
    </div>
  );
}

function SceneIndex({
  index,
  total = "06",
  size = 12,
}: {
  index: string;
  total?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.6,
        color: C.inkFaint,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: size * 0.3,
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: C.brandSoft }}>{index}</span>
      <span style={{ color: C.inkFainter }}>/</span>
      <span>{total}</span>
    </div>
  );
}

function Headline({
  title,
  titleAccent,
  size,
}: {
  title: string;
  titleAccent: string;
  size: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        fontSize: size,
        fontWeight: 900,
        lineHeight: 0.98,
        letterSpacing: -size * 0.045,
      }}
    >
      <span>{title}</span>
      {titleAccent ? (
        <span
          style={{
            background: `linear-gradient(95deg, ${C.brandSoft} 0%, ${C.accentPurple} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {titleAccent}
        </span>
      ) : null}
    </div>
  );
}

/* ── SCENE GRAPHICS ──────────────────────────────────────────────── */

/* hero: 4 concentric pulse rings */
function HeroGraphic({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {[1, 0.78, 0.56, 0.34].map((scale, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: size * scale,
            height: size * scale,
            borderRadius: "50%",
            border: `${1 + i * 0.4}px solid ${C.brandSoft}`,
            opacity: 0.18 + i * 0.18,
          }}
        />
      ))}
      <div
        style={{
          width: size * 0.13,
          height: size * 0.13,
          borderRadius: "50%",
          background: C.brandSoft,
          boxShadow: `0 0 ${size * 0.18}px ${C.brand}`,
        }}
      />
    </div>
  );
}

/* multistream: vertical column of 4 platform rows + RTMP footer */
function MultistreamGraphic({ size }: { size: number }) {
  const labels = ["YouTube", "Twitch", "Kick", "TikTok"];
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: size * 0.05,
        padding: size * 0.05,
        borderRadius: size * 0.05,
        border: `1px solid ${C.brand}30`,
        background: `${C.surface1}80`,
      }}
    >
      {labels.map((l, i) => (
        <div
          key={l}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: size * 0.04,
            padding: `${size * 0.04}px ${size * 0.06}px`,
            borderRadius: size * 0.025,
            background: C.surface,
            border: `1px solid ${C.inkFainter}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: size * 0.05 }}>
            <div
              style={{
                width: size * 0.055,
                height: size * 0.055,
                borderRadius: "50%",
                background: C.brandSoft,
                opacity: 0.5 + i * 0.16,
                boxShadow: `0 0 ${size * 0.08}px ${C.brandSoft}55`,
              }}
            />
            <span
              style={{
                color: C.inkStrong,
                fontSize: size * 0.07,
                fontWeight: 700,
              }}
            >
              {l}
            </span>
          </div>
          <span
            style={{
              color: C.brandSoft,
              fontSize: size * 0.045,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            LIVE
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: size * 0.02,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.inkFaint,
          fontSize: size * 0.045,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        + Custom RTMP
      </div>
    </div>
  );
}

/* ai-cohost: stacked speech-bubble silhouette */
function AiCohostGraphic({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* outer pulse */}
      <div
        style={{
          position: "absolute",
          width: size * 0.96,
          height: size * 0.96,
          borderRadius: "50%",
          border: `1px solid ${C.brandSoft}30`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: "50%",
          border: `1px solid ${C.brandSoft}55`,
        }}
      />
      {/* viewer bubble (smaller, top-left) */}
      <div
        style={{
          position: "absolute",
          top: size * 0.18,
          left: size * 0.16,
          padding: `${size * 0.04}px ${size * 0.07}px`,
          borderRadius: size * 0.06,
          border: `1px solid ${C.inkFaint}`,
          background: C.surface1,
          color: C.inkMuted,
          fontSize: size * 0.045,
          fontWeight: 600,
          display: "flex",
        }}
      >
        viewer
      </div>
      {/* AI reply (larger, bottom-right, brand) */}
      <div
        style={{
          position: "absolute",
          bottom: size * 0.16,
          right: size * 0.12,
          padding: `${size * 0.05}px ${size * 0.09}px`,
          borderRadius: size * 0.06,
          border: `1px solid ${C.brand}80`,
          background: `${C.brand}25`,
          color: C.brandSofter,
          fontSize: size * 0.055,
          fontWeight: 700,
          display: "flex",
        }}
      >
        ai co-host
      </div>
      {/* center node */}
      <div
        style={{
          width: size * 0.1,
          height: size * 0.1,
          borderRadius: "50%",
          background: C.brandSoft,
          boxShadow: `0 0 ${size * 0.15}px ${C.brand}`,
        }}
      />
    </div>
  );
}

/* browser: stylized chrome (traffic lights + URL bar) wrapping nothing */
function BrowserGraphic({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size * 0.7,
        display: "flex",
        flexDirection: "column",
        borderRadius: size * 0.045,
        border: `1px solid ${C.inkFaint}`,
        background: C.surface1,
        overflow: "hidden",
      }}
    >
      {/* chrome bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: size * 0.04,
          padding: `${size * 0.035}px ${size * 0.05}px`,
          borderBottom: `1px solid ${C.inkFainter}`,
          background: C.surface2,
        }}
      >
        {[C.danger, "#fbbf24", "#22c55e"].map((dot) => (
          <div
            key={dot}
            style={{
              width: size * 0.025,
              height: size * 0.025,
              borderRadius: "50%",
              background: dot,
              opacity: 0.85,
            }}
          />
        ))}
        <div
          style={{
            marginLeft: size * 0.04,
            padding: `${size * 0.018}px ${size * 0.08}px`,
            borderRadius: size * 0.025,
            background: C.surface,
            color: C.brandSoft,
            fontSize: size * 0.038,
            fontWeight: 700,
            letterSpacing: 1,
            display: "flex",
            alignItems: "center",
            gap: size * 0.03,
          }}
        >
          <div
            style={{
              width: size * 0.018,
              height: size * 0.018,
              borderRadius: "50%",
              background: C.danger,
              boxShadow: `0 0 ${size * 0.04}px ${C.danger}`,
            }}
          />
          zerocast.live/studio · LIVE
        </div>
      </div>
      {/* viewport content — abstract */}
      <div
        style={{
          flex: 1,
          padding: size * 0.05,
          display: "flex",
          flexDirection: "column",
          gap: size * 0.025,
        }}
      >
        <div
          style={{
            width: "70%",
            height: size * 0.04,
            background: C.surface2,
            borderRadius: size * 0.01,
          }}
        />
        <div
          style={{
            width: "45%",
            height: size * 0.03,
            background: C.surface2,
            borderRadius: size * 0.01,
          }}
        />
        <div
          style={{
            display: "flex",
            gap: size * 0.025,
            marginTop: size * 0.03,
          }}
        >
          <div
            style={{
              flex: 1,
              height: size * 0.18,
              borderRadius: size * 0.015,
              background: `linear-gradient(135deg, ${C.brand}20, ${C.surface2})`,
              border: `1px solid ${C.brand}30`,
            }}
          />
          <div
            style={{
              flex: 1,
              height: size * 0.18,
              borderRadius: size * 0.015,
              background: C.surface2,
              border: `1px solid ${C.inkFainter}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* beta: numeric counter style block */
function BetaGraphic({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* outer hex frame */}
      <div
        style={{
          position: "absolute",
          width: size * 0.92,
          height: size * 0.92,
          borderRadius: size * 0.04,
          border: `2px solid ${C.brand}55`,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: size * 0.04,
          border: `1px solid ${C.brand}30`,
          transform: "rotate(45deg)",
        }}
      />
      {/* center counter */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size * 0.02,
        }}
      >
        <div
          style={{
            color: C.brandSoft,
            fontSize: size * 0.075,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          BETA
        </div>
        <div
          style={{
            color: C.inkStrong,
            fontSize: size * 0.32,
            fontWeight: 900,
            letterSpacing: -size * 0.012,
            lineHeight: 1,
            display: "flex",
          }}
        >
          v2.1
        </div>
        <div
          style={{
            color: C.inkFaint,
            fontSize: size * 0.045,
            fontWeight: 600,
            letterSpacing: 3,
          }}
        >
          NOW OPEN
        </div>
      </div>
    </div>
  );
}

/* quote: massive opening quote mark */
function QuoteGraphic({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: C.brand,
          fontSize: size * 1.3,
          fontWeight: 900,
          opacity: 0.4,
          lineHeight: 0.6,
          display: "flex",
        }}
      >
        “
      </div>
      <div
        style={{
          position: "absolute",
          bottom: size * 0.12,
          right: size * 0.18,
          width: size * 0.45,
          height: 1,
          background: C.brandSoft,
        }}
      />
    </div>
  );
}

/* ph-launch: oversized upvote chevron + tally pill (PH iconography w/o the orange) */
function PhLaunchGraphic({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: size * 0.04,
      }}
    >
      {/* outer brand rings */}
      <div
        style={{
          position: "absolute",
          width: size * 0.94,
          height: size * 0.94,
          borderRadius: "50%",
          border: `1px solid ${C.brand}40`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: "50%",
          border: `1px solid ${C.brandSoft}40`,
        }}
      />
      {/* upvote chevron — Unicode ↑ glyph (▲ is missing in satori default font set) */}
      <div
        style={{
          display: "flex",
          color: C.brandSoft,
          fontSize: size * 0.4,
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: -size * 0.01,
          textShadow: `0 0 ${size * 0.06}px ${C.brand}cc`,
        }}
      >
        ↑
      </div>
      {/* upvote count pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: size * 0.04,
          padding: `${size * 0.035}px ${size * 0.08}px`,
          borderRadius: 999,
          border: `1px solid ${C.brand}80`,
          background: `${C.brand}1f`,
          color: C.brandSofter,
          fontSize: size * 0.075,
          fontWeight: 800,
          letterSpacing: -size * 0.002,
        }}
      >
        Hunt today
      </div>
    </div>
  );
}

function SceneGraphic({ scene, size }: { scene: SceneId; size: number }) {
  switch (scene) {
    case "hero":
      return <HeroGraphic size={size} />;
    case "multistream":
      return <MultistreamGraphic size={size} />;
    case "ai-cohost":
      return <AiCohostGraphic size={size} />;
    case "browser":
      return <BrowserGraphic size={size} />;
    case "beta":
      return <BetaGraphic size={size} />;
    case "quote":
      return <QuoteGraphic size={size} />;
    case "ph-launch":
      return <PhLaunchGraphic size={size} />;
    case "ph-maker":
      return <QuoteGraphic size={size} />;
  }
}

/* ── LAYOUTS ──────────────────────────────────────────────────────── */

type LayoutProps = {
  scene: SceneId;
  def: SceneDef;
  w: number;
  h: number;
};

function FrameBase({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: C.surface,
        position: "relative",
        color: C.inkStrong,
        fontFamily:
          'Inter, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
        display: "flex",
      }}
    >
      <Atmosphere w={w} h={h} />
      {children}
    </div>
  );
}

function OgLayout({ scene, def, w, h }: LayoutProps) {
  const margin = Math.round(h * 0.11);
  const headingPx = Math.round(h * 0.12);
  const graphicSize = Math.round(h * 0.72);
  return (
    <FrameBase w={w} h={h}>
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: margin,
          zIndex: 1,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: margin,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Wordmark size={Math.round(h * 0.05)} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <StatusPill text={def.kicker} size={Math.round(h * 0.022)} />
              <SceneIndex index={def.index} size={Math.round(h * 0.022)} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Headline title={def.title} titleAccent={def.titleAccent} size={headingPx} />
            <div
              style={{
                color: C.inkMuted,
                fontSize: Math.round(h * 0.034),
                lineHeight: 1.35,
                maxWidth: w * 0.55,
              }}
            >
              {def.sub}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <SceneGraphic scene={scene} size={graphicSize} />
          <div
            style={{
              color: C.inkFaint,
              fontSize: Math.round(h * 0.022),
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            zerocast.live
          </div>
        </div>
      </div>
    </FrameBase>
  );
}

function SquareLayout({ scene, def, w, h }: LayoutProps) {
  const margin = Math.round(w * 0.075);
  const headingPx = Math.round(w * 0.084);
  const graphicSize = Math.round(w * 0.32);
  return (
    <FrameBase w={w} h={h}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: margin,
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Wordmark size={Math.round(w * 0.03)} />
            <StatusPill text={def.kicker} size={Math.round(w * 0.014)} />
          </div>
          <SceneIndex index={def.index} size={Math.round(w * 0.014)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <Headline
            title={def.title}
            titleAccent={def.titleAccent}
            size={headingPx}
          />
          <div
            style={{
              color: C.inkMuted,
              fontSize: Math.round(w * 0.024),
              lineHeight: 1.4,
              maxWidth: w * 0.8,
            }}
          >
            {def.sub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              color: C.inkFaint,
              fontSize: Math.round(w * 0.015),
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: C.inkEmphasis }}>zerocast.live</span>
            <span style={{ color: C.inkFaint, letterSpacing: 2 }}>
              Browser-native multistream
            </span>
          </div>
          <SceneGraphic scene={scene} size={graphicSize} />
        </div>
      </div>
    </FrameBase>
  );
}

function StoryLayout({ scene, def, w, h }: LayoutProps) {
  const margin = Math.round(w * 0.085);
  const headingPx = Math.round(w * 0.12);
  const graphicSize = Math.round(w * 0.58);
  return (
    <FrameBase w={w} h={h}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: margin,
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            <Wordmark size={Math.round(w * 0.04)} />
            <StatusPill text={def.kicker} size={Math.round(w * 0.02)} />
          </div>
          <SceneIndex
            index={def.index}
            size={Math.round(w * 0.02)}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <SceneGraphic scene={scene} size={graphicSize} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <Headline
            title={def.title}
            titleAccent={def.titleAccent}
            size={headingPx}
          />
          <div
            style={{
              color: C.inkMuted,
              fontSize: Math.round(w * 0.032),
              lineHeight: 1.4,
              maxWidth: w * 0.85,
            }}
          >
            {def.sub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingTop: margin * 0.5,
            borderTop: `1px solid ${C.inkFainter}`,
          }}
        >
          <div
            style={{
              color: C.inkFaint,
              fontSize: Math.round(w * 0.02),
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            zerocast.live
          </div>
          <div
            style={{
              color: C.brandSoft,
              fontSize: Math.round(w * 0.02),
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Apply for Beta →
          </div>
        </div>
      </div>
    </FrameBase>
  );
}

function BannerLayout({ scene, def, w, h }: LayoutProps) {
  const margin = Math.round(h * 0.14);
  const headingPx = Math.round(h * 0.24);
  const graphicSize = Math.round(h * 0.7);
  return (
    <FrameBase w={w} h={h}>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          padding: margin,
          gap: margin,
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: w * 0.22,
          }}
        >
          <Wordmark size={Math.round(h * 0.09)} />
          <StatusPill text={def.kicker} size={Math.round(h * 0.038)} />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Headline
            title={def.title}
            titleAccent={def.titleAccent}
            size={headingPx}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: C.inkFaint,
              fontSize: Math.round(h * 0.046),
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            <SceneIndex
              index={def.index}
              size={Math.round(h * 0.04)}
            />
            <span style={{ color: C.inkFainter }}>·</span>
            <span>zerocast.live</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            minWidth: w * 0.18,
          }}
        >
          <SceneGraphic scene={scene} size={graphicSize} />
        </div>
      </div>
    </FrameBase>
  );
}

/* portrait = square proportions, taller. Reuse SquareLayout. */

/* ph-thumb (240×240): minimal — wordmark mark + brand glow only.
   Text headlines don't fit in 240px and PH renders the title separately. */
function PhThumbLayout({ w, h }: { w: number; h: number }) {
  return (
    <FrameBase w={w} h={h}>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: w * 0.45,
            height: w * 0.45,
            borderRadius: w * 0.12,
            background: C.brand,
            boxShadow: `0 0 ${w * 0.25}px ${C.brand}aa`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.inkStrong,
            fontSize: w * 0.32,
            fontWeight: 900,
            letterSpacing: -w * 0.012,
          }}
        >
          Z
        </div>
      </div>
    </FrameBase>
  );
}

/* ── HANDLER ──────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const variantParam = searchParams.get("variant");
  const sceneParam = searchParams.get("scene");

  const variant: VariantId = isVariant(variantParam) ? variantParam : "og";
  const scene: SceneId = isScene(sceneParam) ? sceneParam : "hero";

  const base = SCENES[scene];
  // cap to prevent OG-renderer DoS
  const cap = (s: string | null, n: number) => s == null ? null : s.slice(0, n);
  const def: SceneDef = {
    index: base.index,
    kicker: cap(searchParams.get("kicker"), 40) ?? base.kicker,
    title: cap(searchParams.get("title"), 100) ?? base.title,
    titleAccent: cap(searchParams.get("accent"), 100) ?? base.titleAccent,
    sub: cap(searchParams.get("sub"), 280) ?? base.sub,
  };

  const { w, h } = VARIANTS[variant];
  const props: LayoutProps = { scene, def, w, h };

  let element: React.ReactElement;
  switch (variant) {
    case "square":
    case "portrait":
      element = <SquareLayout {...props} />;
      break;
    case "og":
    case "ph-gallery":
      // PH gallery is 1270×760 — almost identical aspect to OG (1200×630),
      // OgLayout scales proportionally so it fits without a custom layout.
      element = <OgLayout {...props} />;
      break;
    case "story":
      element = <StoryLayout {...props} />;
      break;
    case "banner":
      element = <BannerLayout {...props} />;
      break;
    case "ph-thumb":
      element = <PhThumbLayout w={w} h={h} />;
      break;
  }

  return new ImageResponse(element, {
    width: w,
    height: h,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
