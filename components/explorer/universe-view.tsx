"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { live } from "@/lib/live";
import { DSO_IMAGES, DSO_OBJS, eqVec, GAL_CENTER, GAL_NORTH, HUDF, LY_AU, UOBJS, type UObj } from "@/lib/universe";

/** View radius 10^z AU always maps to VIEW scene units, so every tier is true linear scale. */
const VIEW = 100;
const Z_MIN = 1.2;
const Z_MAX = 15.6;

function fade(z: number, a: number, b: number, c: number, d: number) {
  if (z < a || z > d) return 0;
  if (z < b) return (z - a) / (b - a);
  if (z > c) return 1 - (z - c) / (d - c);
  return 1;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pointVert = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uPx;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx;
  }
`;
const pointFrag = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = exp(-d * d * 60.0);
    float halo = exp(-d * d * 14.0) * 0.25;
    float a = core + halo;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * a * 1.4, a * uOpacity);
  }
`;

function usePointsMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 1 }, uPx: { value: Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio) } },
        vertexShader: pointVert,
        fragmentShader: pointFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
}

function buildPoints(pos: number[], col: number[], size: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  return g;
}

/** A tier: content authored in `unitAu` units, shown while zoom is inside the fade window. */
function Tier({ unitAu, win, children, onOpacity }: { unitAu: number; win: [number, number, number, number]; children: ReactNode; onOpacity?: (o: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const o = fade(live.uZoom, ...win);
    g.visible = o > 0.001;
    g.scale.setScalar((VIEW / Math.pow(10, live.uZoom)) * unitAu);
    onOpacity?.(o);
  });
  return <group ref={ref}>{children}</group>;
}

function Label({ obj, pos }: { obj: UObj; pos: [number, number, number] }) {
  const el = useRef<HTMLButtonElement>(null);
  useFrame(() => {
    if (!el.current) return;
    const on = Math.abs(live.uZoom - obj.zoom) < 1.6;
    el.current.style.opacity = on ? "1" : "0";
    el.current.style.pointerEvents = on ? "auto" : "none";
    el.current.dataset.on = live.uObj === obj.id ? "1" : "0";
  });
  return (
    <Html position={pos} center zIndexRange={[12, 0]} wrapperClass="tag-wrap">
      <button
        ref={el}
        type="button"
        className="body-tag u-tag"
        onClick={() => window.dispatchEvent(new CustomEvent("anorix-uobj", { detail: obj.id }))}
      >
        {obj.name}
      </button>
    </Html>
  );
}

function SolarTier() {
  // Planet orbits (AU), on the ecliptic tilted 23.44° from the equator.
  const lines = useMemo(() => {
    const radii = [0.387, 0.723, 1, 1.524, 5.203, 9.537, 19.19, 30.07];
    return radii.map((r) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i += 1) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#8a8a8a", transparent: true }), []);
  const helio = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3b82f6", wireframe: true, transparent: true, opacity: 0.12 }), []);
  return (
    <Tier unitAu={1} win={[0, 0, 3.0, 4.2]} onOpacity={(o) => { mat.opacity = o * 0.5; helio.opacity = o * 0.14; }}>
      <group rotation={[THREE.MathUtils.degToRad(23.44), 0, 0]}>
        {lines.map((g, i) => (
          <primitive key={i} object={new THREE.Line(g, mat)} />
        ))}
      </group>
      <mesh material={helio}>
        <sphereGeometry args={[121.6, 24, 16]} />
      </mesh>
      <Label obj={UOBJS[0]} pos={[0, 121.6, 0]} />
    </Tier>
  );
}

function OortTier() {
  const mat = usePointsMaterial();
  const geo = useMemo(() => {
    const r = mulberry(7);
    const p: number[] = [], c: number[] = [], s: number[] = [];
    for (let i = 0; i < 9000; i += 1) {
      const rad = 2000 + Math.pow(r(), 0.6) * 98000;
      const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1);
      p.push(rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph), rad * Math.sin(ph) * Math.sin(th));
      c.push(0.55, 0.62, 0.75);
      s.push(1.2 + r() * 1.2);
    }
    return buildPoints(p, c, s);
  }, []);
  return (
    <Tier unitAu={1} win={[2.6, 3.8, 5.6, 6.6]} onOpacity={(o) => (mat.uniforms.uOpacity.value = o * 0.55)}>
      <points geometry={geo} material={mat} frustumCulled={false} />
      <Label obj={UOBJS[1]} pos={[0, 60000, 0]} />
    </Tier>
  );
}

type Star = [number, number, number, number, number, string, string, number];

function ciColor(ci: number) {
  const t = THREE.MathUtils.clamp((ci + 0.3) / 2.1, 0, 1);
  return new THREE.Color().setHSL(0.62 - t * 0.55, 0.55 + t * 0.2, 0.78 - t * 0.12);
}

function StarTier() {
  const [stars, setStars] = useState<Star[] | null>(null);
  useEffect(() => {
    fetch("/data/stars.json").then((r) => r.json()).then(setStars);
  }, []);
  const mat = usePointsMaterial();
  const geo = useMemo(() => {
    if (!stars) return null;
    const p: number[] = [], c: number[] = [], s: number[] = [];
    for (const st of stars) {
      // HYG x,y,z: equatorial, x→RA0, y→RA6h, z→north. Convert to scene axes.
      p.push(st[0], st[2], -st[1]);
      const col = ciColor(st[4]);
      c.push(col.r, col.g, col.b);
      s.push(THREE.MathUtils.clamp(6.5 - st[3] * 0.8, 2.0, 9));
    }
    return buildPoints(p, c, s);
  }, [stars]);
  const objs = UOBJS.filter((o) => ["proxima", "sirius", "betelgeuse"].includes(o.id));
  return (
    <Tier unitAu={LY_AU} win={[4.6, 5.4, 9.0, 10.2]} onOpacity={(o) => (mat.uniforms.uOpacity.value = o)}>
      {geo ? <points geometry={geo} material={mat} frustumCulled={false} /> : null}
      {objs.map((o) => (
        <Label key={o.id} obj={o} pos={eqVec(o.raDeg, o.decDeg, o.ly)} />
      ))}
    </Tier>
  );
}

/** Galactic basis in scene coordinates (light-years, Sun at origin). */
function galBasis() {
  const toC = new THREE.Vector3(...eqVec(GAL_CENTER.raDeg, GAL_CENTER.decDeg));
  const up = new THREE.Vector3(...eqVec(GAL_NORTH.raDeg, GAL_NORTH.decDeg));
  const side = new THREE.Vector3().crossVectors(up, toC).normalize();
  return { toC, up, side };
}

function HereTag({ el }: { el: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={el} className="body-tag" style={{ color: "#9cc2ff", opacity: 0 }}>
      You are here
    </div>
  );
}

function useTex(url: string) {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [url]);
}

/** Face-on Milky Way: NASA/JPL-Caltech/R. Hurt (SSC) artist's concept, laid in the real galactic plane. */
function MilkyWayDisk({ opacity }: { opacity: { current: number } }) {
  const tex = useTex("/textures/universe/milkyway_faceon.jpg");
  const { mats, matrix } = useMemo(() => {
    const { toC, up, side } = galBasis();
    const m = new THREE.Matrix4().makeBasis(side.clone().negate(), toC, up);
    m.setPosition(toC.clone().multiplyScalar(26000));
    const mk = (o: number) =>
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    return { mats: [mk(1), mk(0.18), mk(0.18)], matrix: m };
  }, [tex]);
  const glow = useMemo(() => glowTexture(), []);
  const glowMat = useMemo(() => new THREE.SpriteMaterial({ map: glow, color: "#ffe2b0", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }), [glow]);
  useFrame(() => {
    mats[0].opacity = opacity.current;
    mats[1].opacity = mats[2].opacity = opacity.current * 0.18;
    glowMat.opacity = opacity.current * 0.55;
  });
  const W = 118000;
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      <mesh material={mats[0]}>
        <planeGeometry args={[W, W]} />
      </mesh>
      {/* Thin stacked copies give the disk a soft vertical glow when seen edge-on. */}
      <mesh material={mats[1]} position={[0, 0, 900]} scale={0.97}>
        <planeGeometry args={[W, W]} />
      </mesh>
      <mesh material={mats[2]} position={[0, 0, -900]} scale={0.97}>
        <planeGeometry args={[W, W]} />
      </mesh>
      <sprite material={glowMat} scale={[26000, 26000, 1]} />
    </group>
  );
}

let glowCache: THREE.Texture | null = null;
function glowTexture() {
  if (glowCache) return glowCache;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  glowCache = new THREE.CanvasTexture(c);
  return glowCache;
}

function GalaxyTier() {
  const here = useRef<HTMLDivElement>(null);
  const op = useRef(0);
  useFrame(() => {
    if (here.current) here.current.style.opacity = live.uZoom > 8.6 && live.uZoom < 12.4 ? "1" : "0";
  });
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#3b82f6", toneMapped: false, transparent: true }), []);
  const objs = UOBJS.filter((o) => ["galcenter", "milkyway"].includes(o.id));
  return (
    <Tier unitAu={LY_AU} win={[8.0, 9.0, 12.6, 13.6]} onOpacity={(o) => { op.current = o; sunMat.opacity = o; }}>
      <MilkyWayDisk opacity={op} />
      <mesh material={sunMat} scale={350}>
        <sphereGeometry args={[1, 12, 12]} />
      </mesh>
      <Html position={[0, 1800, 0]} center zIndexRange={[12, 0]} wrapperClass="tag-wrap" pointerEvents="none">
        <HereTag el={here} />
      </Html>
      {objs.map((o) => (
        <Label key={o.id} obj={o} pos={o.id === "milkyway" ? (galBasis().toC.multiplyScalar(26000).addScaledVector(galBasis().up, 22000).toArray() as [number, number, number]) : eqVec(o.raDeg, o.decDeg, o.ly)} />
      ))}
    </Tier>
  );
}

/** Real images as billboards, sized to each galaxy's true diameter (ly). */
const GAL_IMAGES: { id: string; url: string; size: number }[] = [
  { id: "andromeda", url: "/textures/universe/m31.jpg", size: 260000 },
  { id: "triangulum", url: "/textures/universe/m33.jpg", size: 75000 },
  { id: "lmc", url: "/textures/universe/lmc.jpg", size: 20000 },
  { id: "smc", url: "/textures/universe/smc.jpg", size: 12000 },
];

function GalaxySprite({ url, size, pos, op }: { url: string; size: number; pos: [number, number, number]; op: { current: number } }) {
  const tex = useTex(url);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }), [tex]);
  useFrame(() => (mat.opacity = op.current));
  return <sprite material={mat} position={pos} scale={[size, size, 1]} />;
}

/**
 * Catalogued nebulae and clusters at their real RA/Dec/distance with real images.
 * Each is drawn at its true diameter or, when that would be sub-pixel, enlarged to
 * a minimum share of the view (its panel says so).
 */
function DsoSprite({ url, sizeLy, pos, op, unit = 1, min = 0.05 }: { url: string; sizeLy: number; pos: [number, number, number]; op: { current: number }; unit?: number; min?: number }) {
  const tex = useTex(url);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }), [tex]);
  const ref = useRef<THREE.Sprite>(null);
  useFrame(() => {
    mat.opacity = op.current * 0.95;
    const view = Math.pow(10, live.uZoom) / LY_AU / unit;
    const s = Math.max(sizeLy / unit, view * min);
    ref.current?.scale.set(s, s, 1);
  });
  return <sprite ref={ref} material={mat} position={pos} />;
}

function DsoTier() {
  const op = useRef(0);
  return (
    <Tier unitAu={LY_AU} win={[6.6, 7.3, 10.6, 11.4]} onOpacity={(o) => (op.current = o)}>
      {DSO_IMAGES.map((g) => {
        const o = DSO_OBJS.find((x) => x.id === g.id)!;
        return <DsoSprite key={g.id} url={g.url} sizeLy={g.sizeLy} pos={eqVec(o.raDeg, o.decDeg, o.ly)} op={op} />;
      })}
      {DSO_OBJS.map((o) => (
        <Label key={o.id} obj={o} pos={eqVec(o.raDeg, o.decDeg, o.ly)} />
      ))}
    </Tier>
  );
}

function LocalGroupTier() {
  const op = useRef(0);
  const objs = UOBJS.filter((o) => ["lmc", "smc", "andromeda", "triangulum"].includes(o.id));
  return (
    <Tier unitAu={LY_AU} win={[10.2, 11.0, 13.4, 14.4]} onOpacity={(o) => (op.current = o)}>
      {GAL_IMAGES.map((g) => {
        const o = UOBJS.find((x) => x.id === g.id)!;
        return <GalaxySprite key={g.id} url={g.url} size={g.size} pos={eqVec(o.raDeg, o.decDeg, o.ly)} op={op} />;
      })}
      {objs.map((o) => (
        <Label key={o.id} obj={o} pos={eqVec(o.raDeg, o.decDeg, o.ly)} />
      ))}
    </Tier>
  );
}

function WebTier() {
  // Unit: 1 million light-years. 43,463 galaxies from the 2MASS Redshift Survey (Huchra et al. 2012),
  // distance = cz / H0 with H0 = 70 km/s/Mpc.
  const mat = usePointsMaterial();
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    fetch("/data/2mrs.json")
      .then((r) => r.json())
      .then((rows: [number, number, number][]) => {
        const p: number[] = [], c: number[] = [], s: number[] = [];
        for (const [ra, de, mly] of rows) {
          p.push(...eqVec(ra, de, mly));
          const t = Math.min(1, mly / 1200);
          c.push(1 - t * 0.35, 0.82 - t * 0.2, 0.62 + t * 0.35);
          s.push(2.4);
        }
        setGeo(buildPoints(p, c, s));
      });
  }, []);
  const edge = useMemo(() => new THREE.MeshBasicMaterial({ color: "#c07a4a", wireframe: true, transparent: true, opacity: 0.06 }), []);
  const objs = UOBJS.filter((o) => o.id === "virgo");
  const hudfOp = useRef(0);
  return (
    <Tier unitAu={LY_AU * 1e6} win={[12.4, 13.2, 16, 17]} onOpacity={(o) => { mat.uniforms.uOpacity.value = o * 0.9; edge.opacity = o * 0.07; hudfOp.current = o * 0.9; }}>
      {geo ? <points geometry={geo} material={mat} frustumCulled={false} /> : null}
      <mesh material={edge}>
        <sphereGeometry args={[46500, 36, 24]} />
      </mesh>
      {objs.map((o) => (
        <Label key={o.id} obj={o} pos={eqVec(o.raDeg, o.decDeg, o.ly / 1e6)} />
      ))}
      <Label obj={UOBJS.find((o) => o.id === "observable")!} pos={[0, 46500, 0]} />
      <DsoSprite url="/textures/dso/hudf.webp" sizeLy={0} unit={1e6} min={0.06} pos={eqVec(HUDF.raDeg, HUDF.decDeg, 13000)} op={hudfOp} />
      <Label obj={HUDF} pos={eqVec(HUDF.raDeg, HUDF.decDeg, 13000)} />
    </Tier>
  );
}

/**
 * ESA Gaia DR2 all-sky map (ESA/Gaia/DPAC, CC BY-SA 3.0 IGO), Hammer–Aitoff in
 * galactic coordinates, reprojected per pixel onto a sky sphere around the camera.
 */
const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const skyFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform mat3 uEqToGal;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    // scene → equatorial (x→RA0, y→RA6h, z→NCP)
    vec3 eq = vec3(d.x, -d.z, d.y);
    vec3 g = uEqToGal * eq;
    float l = atan(g.y, g.x);
    float b = asin(clamp(g.z, -1.0, 1.0));
    float k = sqrt(1.0 + cos(b) * cos(l * 0.5));
    float x = 2.0 * sqrt(2.0) * cos(b) * sin(l * 0.5) / k;
    float y = sqrt(2.0) * sin(b) / k;
    vec2 uv = vec2(0.5 - x / (4.0 * sqrt(2.0)), 0.5 + y / (2.0 * sqrt(2.0)));
    vec3 col = texture2D(uMap, uv).rgb;
    gl_FragColor = vec4(col * 1.15, uOpacity);
  }
`;

function GaiaSky() {
  const tex = useTex("/textures/universe/gaia_sky.jpg");
  const mat = useMemo(() => {
    // IAU equatorial (J2000) → galactic rotation matrix (rows).
    const m = new THREE.Matrix3().set(
      -0.0548755604, -0.8734370902, -0.4838350155,
      0.4941094279, -0.4448296300, 0.7469822445,
      -0.8676661490, -0.1980763734, 0.4559837762,
    );
    return new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uOpacity: { value: 1 }, uEqToGal: { value: m } },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }, [tex]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.copy(camera.position);
    // Seen from inside the galaxy; fades as you zoom out past its disk.
    mat.uniforms.uOpacity.value = fade(live.uZoom, 3.6, 5.0, 8.8, 9.8);
    if (ref.current) ref.current.visible = mat.uniforms.uOpacity.value > 0.002;
  });
  return <mesh ref={ref} material={mat} renderOrder={-30} frustumCulled={false}><sphereGeometry args={[900, 64, 48]} /></mesh>;
}

function SunDot() {
  return (
    <mesh>
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
    </mesh>
  );
}

function ZoomDriver() {
  const { gl } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { enableZoom: boolean } | null;
  const tick = useRef(0);
  useEffect(() => {
    if (controls) controls.enableZoom = false;
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      live.uTarget = THREE.MathUtils.clamp(live.uTarget + Math.sign(e.deltaY) * Math.min(0.35, Math.abs(e.deltaY) / 300), Z_MIN, Z_MAX);
    };
    let pinch = 0;
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) live.uTarget = THREE.MathUtils.clamp(live.uTarget + (pinch - d) / 120, Z_MIN, Z_MAX);
      pinch = d;
    };
    const onEnd = () => (pinch = 0);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouch, { passive: true });
    el.addEventListener("touchend", onEnd);
    return () => {
      if (controls) controls.enableZoom = true;
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouch);
      el.removeEventListener("touchend", onEnd);
    };
  }, [gl, controls]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * (live.reduce ? 60 : 3.2));
    live.uZoom += (live.uTarget - live.uZoom) * k;
    tick.current += dt;
    if (tick.current > 0.12) {
      tick.current = 0;
      window.dispatchEvent(new Event("anorix-uzoom"));
    }
  });
  return null;
}

export function UniverseView() {
  return (
    <group>
      <ZoomDriver />
      <GaiaSky />
      <SunDot />
      <SolarTier />
      <OortTier />
      <StarTier />
      <DsoTier />
      <GalaxyTier />
      <LocalGroupTier />
      <WebTier />
    </group>
  );
}
