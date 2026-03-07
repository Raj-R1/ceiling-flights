import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { GLASS_SURFACE_TOKENS } from '../theme/glassTokens';

type Props = {
  children: ReactNode;
  radius?: number | string;
  p?: number | string;
  px?: number | string;
  py?: number | string;
  blur?: number;
  style?: CSSProperties;
  className?: string;
};

// Squircle-convex splay profile.
// t=0 (at edge) → 1.0 (full displacement), t=1 (center) → 0.0 (none).
// Uses Apple's preferred y = (1-(1-x)^4)^0.25 curve, inverted.
function splayProfile(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - Math.pow(1 - c, 4), 0.25);
}

// Pixels within this margin around the element get neutral displacement (128,128)
// so that edge pixels displaced outward can sample valid backdrop content rather
// than the transparent-black that SVG filters return outside their primitive region.
// Must be ≥ the feDisplacementMap scale value (44) to prevent dark-edge artifacts.
const FILTER_MARGIN = 52;

// Build a displacement map PNG data URL for a given element size.
// The canvas is padded by FILTER_MARGIN on each side with neutral values so the
// SVG filter region can extend beyond the element without hitting empty space.
// R encodes X displacement, G encodes Y displacement.
// Value 128 = no displacement. >128 = shift toward that edge, <128 = away.
function buildDisplacementMap(width: number, height: number): string {
  const m = FILTER_MARGIN;
  const canvasW = width  + 2 * m;
  const canvasH = height + 2 * m;

  const canvas = document.createElement('canvas');
  canvas.width  = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const img = ctx.createImageData(canvasW, canvasH);
  const d = img.data;

  // Edge zone: proportion of the smaller dimension that shows the lens effect.
  const edgeZone = Math.min(width, height) * 0.34;
  // How strongly to push pixels outward at the edge (0–1 scale before ×127 encode).
  const strength = 0.58;

  for (let cy = 0; cy < canvasH; cy++) {
    for (let cx = 0; cx < canvasW; cx++) {
      const i = (cy * canvasW + cx) * 4;
      // Translate canvas coords to element-space coords.
      const x = cx - m;
      const y = cy - m;

      if (x < 0 || x >= width || y < 0 || y >= height) {
        // Margin area: neutral displacement so no artefacts at element edges.
        d[i] = 128; d[i + 1] = 128; d[i + 2] = 128; d[i + 3] = 255;
        continue;
      }

      // Normalized proximity to each edge (0 = at edge, 1 = beyond edge zone).
      const tL = Math.min(1, x / edgeZone);
      const tR = Math.min(1, (width  - 1 - x) / edgeZone);
      const tT = Math.min(1, y / edgeZone);
      const tB = Math.min(1, (height - 1 - y) / edgeZone);

      // X: positive near right edge (sample from right = splay outward),
      //    negative near left edge (sample from left).
      const dx = (splayProfile(tR) - splayProfile(tL)) * strength;
      // Y: positive near bottom, negative near top.
      const dy = (splayProfile(tB) - splayProfile(tT)) * strength;

      d[i]     = Math.max(0, Math.min(255, Math.round(128 + dx * 127)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(128 + dy * 127)));
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function toPx(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function LiquidGlass({
  children,
  radius = 18,
  p,
  px,
  py,
  blur = 4,
  style,
  className,
}: Props) {
  // Unique, CSS-safe filter ID per component instance.
  const rawId = useId();
  const filterId = `lg${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<{ url: string; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const rebuild = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w < 4 || h < 4) return;
      setMap({ url: buildDisplacementMap(w, h), w, h });
    };

    const obs = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      // Debounce to avoid rebuilding during panel show/hide transition frames.
      timer = setTimeout(rebuild, 110);
    });

    obs.observe(el);
    // Eagerly build on first attach — don't wait for a resize event.
    rebuild();

    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const r  = typeof radius === 'number' ? `${radius}px` : radius;
  const pt = toPx(py ?? p);
  const pb = toPx(py ?? p);
  const pl = toPx(px ?? p);
  const pr = toPx(px ?? p);

  // Before map is ready, fall back to plain frosted glass identical to the existing theme.
  const bdFilter = map
    ? `url(#${filterId})`
    : `blur(${blur + 7}px) saturate(162%) contrast(1.05)`;

  return (
    <>
      {/*
        Hidden SVG that registers the filter definition.
        display:none keeps it out of layout/paint but filter IDs remain
        accessible from anywhere in the document.
      */}
      <svg style={{ display: 'none' }} aria-hidden="true">
        <defs>
          <filter
            id={filterId}
            x={-FILTER_MARGIN}
            y={-FILTER_MARGIN}
            width={(map?.w ?? 1) + 2 * FILTER_MARGIN}
            height={(map?.h ?? 1) + 2 * FILTER_MARGIN}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            {map && (
              <>
                {/* ── 1. Load displacement map (includes neutral-filled margin) ── */}
                <feImage
                  href={map.url}
                  x={-FILTER_MARGIN}
                  y={-FILTER_MARGIN}
                  width={map.w + 2 * FILTER_MARGIN}
                  height={map.h + 2 * FILTER_MARGIN}
                  preserveAspectRatio="none"
                  result="dispMap"
                />

                {/* ── 2. Refraction: warp backdrop pixels toward edges ── */}
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="dispMap"
                  scale={44}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="refracted"
                />

                {/* ── 3. Frosted blur base ── */}
                <feGaussianBlur in="refracted" stdDeviation={blur} result="frosted" />

                {/* ── 4. Chromatic aberration / dispersion ──
                    Isolate each RGB channel, offset each by a different
                    amount, screen-blend back together. This creates the
                    prismatic colour splay at the lens edges. */}

                {/* Red channel → shifted +x, -y */}
                <feColorMatrix
                  in="frosted"
                  type="matrix"
                  values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  result="rCh"
                />
                <feOffset in="rCh" dx="2.4" dy="-0.8" result="rShift" />

                {/* Green channel → anchor (no shift) */}
                <feColorMatrix
                  in="frosted"
                  type="matrix"
                  values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                  result="gCh"
                />

                {/* Blue channel → shifted -x, +y */}
                <feColorMatrix
                  in="frosted"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                  result="bCh"
                />
                <feOffset in="bCh" dx="-2.4" dy="0.8" result="bShift" />

                {/* Recombine via screen blend (preserves each channel correctly) */}
                <feBlend in="rShift" in2="gCh"    mode="screen" result="rgBlend" />
                <feBlend in="rgBlend" in2="bShift" mode="screen" result="aberrated" />

                {/* ── 5. Saturation lift ── */}
                <feColorMatrix in="aberrated" type="saturate" values="1.55" />
              </>
            )}
          </filter>
        </defs>
      </svg>

      <div
        ref={ref}
        className={className}
        style={{
          borderRadius: r,
          backdropFilter: bdFilter,
          WebkitBackdropFilter: bdFilter,
          // Very thin dark tint — the liquid glass backdrop is the real surface.
          background: 'rgba(20, 23, 29, 0.08)',
          border: `1px solid ${GLASS_SURFACE_TOKENS.border}`,
          boxShadow: [
            // Rim specular highlight — simulates top-left light source on the lens.
            'inset 1px 1px 0 rgba(255, 255, 255, 0.14)',
            'inset -1px -1px 0 rgba(255, 255, 255, 0.04)',
            GLASS_SURFACE_TOKENS.shadow,
          ].join(', '),
          // overflow:hidden clips content and backdrop-filter to border-radius.
          overflow: 'hidden',
          paddingTop:    pt,
          paddingBottom: pb,
          paddingLeft:   pl,
          paddingRight:  pr,
          ...style,
        }}
      >
        {children}
      </div>
    </>
  );
}
