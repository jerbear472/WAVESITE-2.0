"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { HarmonizedTrend } from "@/lib/harmony";
import { HARMONY_TIERS } from "@/lib/harmony";

// ---------------------------------------------------------------------------
// Culture Field — the 3D read of the whole trend landscape.
// One continuous ocean surface; every trend is a swell rising out of it.
//   quadrant = sentiment × momentum, mapped ABSOLUTELY around the 50/50 center
//              (right: gaining momentum, back: loved by the culture) — a trend
//              always falls in its true quadrant, not a batch-relative spot
//   height   = cultural harmony (the single vertical encoding)
//   spread   = WaveScore — how far the wave extends across the plane
//   color    = state tier, blended into the water around each crest
// Overlapping swells merge like real water (max-dominant, so stacked trends
// hint at shared energy without doubling the height read).
// Labels are collision-aware: two labels never overlap on screen. In a dense
// field only the highest-harmony labels render; hovering a crest always
// reveals its label.
// ---------------------------------------------------------------------------

const FIELD_W = 16;
const FIELD_D = 10;
/** Usable half-extent for crest centers, inside the rendered ocean margin. */
const HALF_W = FIELD_W * 0.44;
const HALF_D = FIELD_D * 0.44;

/** Max labels shown at once — the density threshold. Hover always reveals. */
const MAX_LABELS = 10;

interface Swell {
  trend: HarmonizedTrend;
  x: number;
  z: number;
  /** Crest height above the resting ocean — harmony. */
  amp: number;
  /** Gaussian footprint radius on the plane — WaveScore. */
  radius: number;
  /** Breathing offset so the field doesn't pulse in lockstep. */
  phase: number;
  color: THREE.Color;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isNaN(n) ? 0 : n));
}

function swellAmp(t: HarmonizedTrend) {
  return 0.5 + clamp01(t.harmony / 100) * 3.4;
}

function swellRadius(t: HarmonizedTrend) {
  return 0.7 + clamp01(t.wavescore / 100) * 1.6;
}

/**
 * Absolute quadrant layout. 50 is the cultural midline on both axes, so the
 * sign of (score − 50) decides the quadrant outright. A short relaxation pass
 * separates crests that land on top of each other, but a trend clearly on one
 * side of an axis is never pushed across it — quadrant truth beats spacing.
 */
function makeSwells(trends: HarmonizedTrend[]): Swell[] {
  const swells = trends.map((t, i) => {
    const jx = (((i * 37) % 11) / 11 - 0.5) * 0.9;
    const jz = (((i * 53) % 7) / 7 - 0.5) * 0.8;
    return {
      trend: t,
      x: ((clamp01(t.momentum_score / 100) - 0.5) / 0.5) * HALF_W + jx,
      z: -(((clamp01(t.sentiment_score / 100) - 0.5) / 0.5) * HALF_D) + jz,
      amp: swellAmp(t),
      radius: swellRadius(t),
      phase: i * 1.7,
      color: new THREE.Color(HARMONY_TIERS[t.tier].bright),
    };
  });

  for (let iter = 0; iter < 30; iter++) {
    for (let a = 0; a < swells.length; a++) {
      for (let b = a + 1; b < swells.length; b++) {
        const sa = swells[a];
        const sb = swells[b];
        const minSep = Math.max(1.0, (sa.radius + sb.radius) * 0.5);
        let dx = sb.x - sa.x;
        let dz = sb.z - sa.z;
        let d = Math.hypot(dx, dz);
        if (d >= minSep) continue;
        if (d < 0.001) {
          dx = 1;
          dz = 0;
          d = 1;
        }
        const push = (minSep - d) / 2;
        sa.x -= (dx / d) * push;
        sa.z -= (dz / d) * push;
        sb.x += (dx / d) * push;
        sb.z += (dz / d) * push;
      }
    }
    for (const s of swells) {
      s.x = Math.max(-HALF_W, Math.min(HALF_W, s.x));
      s.z = Math.max(-HALF_D, Math.min(HALF_D, s.z));
      // Hold the quadrant: relaxation may not shove a trend across an axis
      // it clearly sits on one side of.
      const m = s.trend.momentum_score - 50;
      const sen = s.trend.sentiment_score - 50;
      if (m > 2) s.x = Math.max(0.35, s.x);
      if (m < -2) s.x = Math.min(-0.35, s.x);
      if (sen > 2) s.z = Math.min(-0.35, s.z); // loved = back (−z)
      if (sen < -2) s.z = Math.max(0.35, s.z);
    }
  }

  return swells;
}

/**
 * The ocean. Per-vertex Gaussian contributions from every swell are
 * precomputed once per batch (positions are static); each frame only sums
 * them with a gentle breathing amplitude on top of a low ambient ripple.
 * Vertex colors blend each tier's color into the water around its crest.
 */
function SwellSurface({ swells }: { swells: Swell[] }) {
  const { geometry, contrib } = useMemo(() => {
    const g = new THREE.PlaneGeometry(FIELD_W + 9, FIELD_D + 9, 110, 76);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    /** Per vertex: flat [swellIndex, weight, swellIndex, weight, ...]. */
    const contrib: number[][] = [];
    const colors = new Float32Array(n * 3);
    const base = new THREE.Color("#16233c");
    const mix = new THREE.Color();
    const out = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const list: number[] = [];
      let sumW = 0;
      mix.setRGB(0, 0, 0);
      for (let s = 0; s < swells.length; s++) {
        const sw = swells[s];
        const dx = vx - sw.x;
        const dz = vz - sw.z;
        const w = Math.exp(-(dx * dx + dz * dz) / (2 * sw.radius * sw.radius));
        if (w > 0.015) {
          list.push(s, w);
          sumW += w;
          mix.r += sw.color.r * w;
          mix.g += sw.color.g * w;
          mix.b += sw.color.b * w;
        }
      }
      contrib.push(list);
      out.copy(base);
      if (sumW > 0) {
        mix.multiplyScalar(1 / sumW);
        out.lerp(mix, Math.min(1, sumW) * 0.85);
      }
      colors[i * 3] = out.r;
      colors[i * 3 + 1] = out.g;
      colors[i * 3 + 2] = out.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry: g, contrib };
  }, [swells]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let y =
        Math.sin(x * 0.5 + t * 0.6) * 0.09 + Math.cos(z * 0.7 + t * 0.5) * 0.07;
      const list = contrib[i];
      let max = 0;
      let sum = 0;
      for (let k = 0; k < list.length; k += 2) {
        const sw = swells[list[k]];
        const c =
          list[k + 1] * sw.amp * (1 + 0.05 * Math.sin(t * 0.8 + sw.phase));
        sum += c;
        if (c > max) max = c;
      }
      y += max + (sum - max) * 0.4;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0.02, 0]}>
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  );
}

/**
 * Screen-space label planner. Every few frames it projects each crest anchor
 * to pixels, estimates its bounding box (Html labels scale with
 * distanceFactor / camera distance), and greedily keeps labels in priority
 * order — hovered first, then harmony — skipping any whose box intersects an
 * already-kept one, capped at MAX_LABELS. Runs inside the Canvas; publishes
 * the visible id set to React state only when it actually changes.
 */
function LabelPlanner({
  swells,
  hoveredId,
  onPlan,
}: {
  swells: Swell[];
  hoveredId: string | null;
  onPlan: (visible: Set<string>) => void;
}) {
  const { camera, size } = useThree();
  const frame = useRef(0);
  const lastKey = useRef("");
  const vec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    frame.current += 1;
    if (frame.current % 10 !== 0) return;

    interface Box {
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      priority: number;
      behind: boolean;
    }
    const boxes: Box[] = swells.map((swell) => {
      const { trend } = swell;
      vec.set(swell.x, swell.amp + 0.7, swell.z);
      const dist = vec.distanceTo(camera.position);
      const ndc = vec.project(camera);
      const px = ((ndc.x + 1) / 2) * size.width;
      const py = ((1 - ndc.y) / 2) * size.height;
      // Approximates drei's <Html distanceFactor={13}> scaling well enough
      // for overlap tests; the 1.25 pad absorbs the approximation error.
      const s = (13 / Math.max(dist, 0.001)) * (size.height / 550) * 1.25;
      const w = Math.max(trend.name.length * 7.8, 40) * s;
      const h = 36 * s;
      return {
        id: trend.id,
        x1: px - w / 2,
        y1: py - h / 2,
        x2: px + w / 2,
        y2: py + h / 2,
        priority: trend.id === hoveredId ? Infinity : trend.harmony,
        behind: ndc.z > 1,
      };
    });

    boxes.sort((a, b) => b.priority - a.priority);
    const kept: Box[] = [];
    for (const box of boxes) {
      if (box.behind) continue;
      if (kept.length >= MAX_LABELS && box.priority !== Infinity) continue;
      const collides = kept.some(
        (k) => box.x1 < k.x2 && box.x2 > k.x1 && box.y1 < k.y2 && box.y2 > k.y1
      );
      // The hovered label always wins its spot; anything it collides with
      // was either kept earlier (higher priority ordering puts hover first)
      // or never rendered.
      if (collides && box.priority !== Infinity) continue;
      kept.push(box);
    }

    const key = kept
      .map((k) => k.id)
      .sort()
      .join("|");
    if (key !== lastKey.current) {
      lastKey.current = key;
      onPlan(new Set(kept.map((k) => k.id)));
    }
  });

  return null;
}

/**
 * Interaction + label for one swell. The surface itself is a single merged
 * mesh, so each crest gets an invisible cylinder proxy for hover and click.
 */
function TrendCrest({
  swell,
  showLabel,
  onHover,
}: {
  swell: Swell;
  showLabel: boolean;
  onHover: (t: HarmonizedTrend | null) => void;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const { trend } = swell;
  const spec = HARMONY_TIERS[trend.tier];

  return (
    <group position={[swell.x, 0, swell.z]}>
      <mesh
        position={[0, swell.amp / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(trend);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
          document.body.style.cursor = "default";
        }}
        onClick={() => router.push(`/trends/${trend.slug}`)}
      >
        <cylinderGeometry
          args={[swell.radius * 0.8, swell.radius * 0.95, swell.amp + 0.6, 14]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* DOM labels via <Html> — troika <Text> spawns a GL context per
          label, and 30+ of them evict the main canvas context entirely.
          Visibility is decided by LabelPlanner; hover always reveals. */}
      {showLabel || hovered ? (
        <Html
          position={[0, swell.amp + 0.7, 0]}
          center
          distanceFactor={13}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              textAlign: "center",
              whiteSpace: "nowrap",
              transform: hovered ? "scale(1.15)" : undefined,
              transition: "transform 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.01em",
                color: trend.tier === "fading" ? "#7d8698" : "#f0f4fa",
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {trend.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11.5,
                fontWeight: 600,
                color: spec.bright,
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {trend.harmony}%
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** Axis dividers on the water line — the quadrant cross. */
function QuadrantAxes() {
  return (
    <group position={[0, 0.04, 0]}>
      <mesh>
        <boxGeometry args={[FIELD_W + 6, 0.015, 0.05]} />
        <meshBasicMaterial color="#3b5a8f" transparent opacity={0.55} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.05, 0.015, FIELD_D + 6]} />
        <meshBasicMaterial color="#3b5a8f" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function AxisLabels() {
  const style: React.CSSProperties = {
    pointerEvents: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#8b96a9",
    textShadow: "0 1px 6px rgba(0,0,0,0.9)",
  };
  const zone: React.CSSProperties = {
    ...style,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.12em",
  };
  return (
    <>
      {/* Axis directions */}
      <Html position={[FIELD_W / 2 + 2.4, 0.1, 0]} center distanceFactor={15}>
        <div style={style}>gaining momentum →</div>
      </Html>
      <Html position={[-FIELD_W / 2 - 2.4, 0.1, 0]} center distanceFactor={15}>
        <div style={style}>← losing momentum</div>
      </Html>
      <Html position={[0, 0.1, -FIELD_D / 2 - 2.2]} center distanceFactor={15}>
        <div style={style}>loved by the culture</div>
      </Html>
      <Html position={[0, 0.1, FIELD_D / 2 + 2.2]} center distanceFactor={15}>
        <div style={style}>contested</div>
      </Html>
      {/* Quadrant zones — the plain-language read of the space. Loved = −z. */}
      <Html
        position={[HALF_W * 0.95, 0.1, -HALF_D * 1.28]}
        center
        distanceFactor={15}
      >
        <div style={{ ...zone, color: "#34d399" }}>
          act now — surging &amp; loved
        </div>
      </Html>
      <Html
        position={[-HALF_W * 0.95, 0.1, -HALF_D * 1.28]}
        center
        distanceFactor={15}
      >
        <div style={{ ...zone, color: "#55a9ff" }}>loved, losing steam</div>
      </Html>
      <Html
        position={[HALF_W * 0.95, 0.1, HALF_D * 1.28]}
        center
        distanceFactor={15}
      >
        <div style={{ ...zone, color: "#fbbf24" }}>risky heat — divisive</div>
      </Html>
      <Html
        position={[-HALF_W * 0.95, 0.1, HALF_D * 1.28]}
        center
        distanceFactor={15}
      >
        <div style={{ ...zone, color: "#7d8698" }}>losing the room</div>
      </Html>
    </>
  );
}

export default function CultureField({
  trends,
  onHover,
}: {
  trends: HarmonizedTrend[];
  onHover?: (t: HarmonizedTrend | null) => void;
}) {
  const shown = useMemo(() => trends.slice(0, 16), [trends]);
  const swells = useMemo(() => makeSwells(shown), [shown]);
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(
    () => new Set()
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <Canvas
      camera={{ position: [0, 9, 12.5], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#111a2c"]} />
      <fog attach="fog" args={["#111a2c", 16, 34]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 12, 6]} intensity={1.1} />
      <SwellSurface swells={swells} />
      <QuadrantAxes />
      <AxisLabels />
      <LabelPlanner
        swells={swells}
        hoveredId={hoveredId}
        onPlan={setVisibleLabels}
      />
      {swells.map((swell) => (
        <TrendCrest
          key={swell.trend.id}
          swell={swell}
          showLabel={visibleLabels.has(swell.trend.id)}
          onHover={(t) => {
            setHoveredId(t?.id ?? null);
            onHover?.(t);
          }}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2.15}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
