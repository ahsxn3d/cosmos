"use client";

import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES, type BodyId } from "@/lib/bodies";
import { INTERIORS } from "@/lib/interiors";
import { live } from "@/lib/live";
import { useExplorer } from "./context";
import { useMaps } from "./materials";

const OUTER = 1.65;
const MIN_SHELL = 0.035;

function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

function fbm(x: number, y: number, z: number) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < 4; i += 1) {
    v += a * vnoise(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

/** Paint vertex colors: deep→main across the shell, streaky for fluids, speckled for rock, dark seams at boundaries. */
function paint(geo: THREE.BufferGeometry, color: string, deep: string, rin: number, rout: number, rough: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(deep);
  const c2 = new THREE.Color(color);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, y, z);
    const t = Math.min(1, Math.max(0, (r - rin) / Math.max(1e-4, rout - rin)));
    const k = 6 + rough * 18;
    const n = fbm(x * k + 3.1, y * k * (rough > 0.3 ? 1 : 0.35) + 1.7, z * k);
    const mixT = Math.min(1, Math.max(0, t * 0.65 + (n - 0.5) * (0.6 + rough * 0.6) + 0.2));
    tmp.copy(c1).lerp(c2, mixT);
    const edge = Math.min(1, t / 0.04) * Math.min(1, (1 - t) / 0.04);
    const shade = (0.62 + 0.38 * edge) * (0.88 + 0.24 * n);
    cols[i * 3] = tmp.r * shade;
    cols[i * 3 + 1] = tmp.g * shade;
    cols[i * 3 + 2] = tmp.b * shade;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
}

function Layer({
  color,
  deep,
  rin,
  rout,
  rough,
  glow,
}: {
  color: string;
  deep: string;
  rin: number;
  rout: number;
  rough: number;
  glow: number;
}) {
  const geos = useMemo(() => {
    const shell = new THREE.SphereGeometry(rout, 96, 64, 0, Math.PI * 1.5);
    const faceA = new THREE.RingGeometry(Math.max(rin, 0.0001), rout, 160, 28, Math.PI / 2, Math.PI);
    const faceB = new THREE.RingGeometry(Math.max(rin, 0.0001), rout, 160, 28, Math.PI / 2, Math.PI);
    faceB.rotateY(-Math.PI / 2);
    for (const g of [faceA, faceB]) paint(g, color, deep, rin, rout, rough);
    // outer shell surface reads as the top of the layer
    paint(shell, color, deep, rout * 0.9, rout, rough);
    return [shell, faceA, faceB];
  }, [color, deep, rin, rout, rough]);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.55 + rough * 0.4,
        metalness: 0,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(color),
        emissiveIntensity: glow * 0.55,
      }),
    [color, rough, glow],
  );
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mat} />
      ))}
    </group>
  );
}

function fmtKm(km: number) {
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

export function AnatomyView({ bodyId }: { bodyId?: BodyId } = {}) {
  const { selected } = useExplorer();
  const maps = useMaps();
  const id = bodyId ?? selected ?? live.selected ?? "earth";
  const body = BODIES[id];
  const interior = INTERIORS[id];
  const spin = useRef<THREE.Group>(null);

  const shells = useMemo(() => {
    const out: { rin: number; rout: number; kmIn: number; kmOut: number; i: number }[] = [];
    let prev = 0;
    let prevKm = 0;
    interior.layers.forEach((layer, i) => {
      let rout = (layer.outerKm / interior.radiusKm) * OUTER;
      if (rout - prev < MIN_SHELL) rout = prev + MIN_SHELL;
      if (i === interior.layers.length - 1) rout = Math.max(rout, OUTER);
      out.push({ rin: prev, rout, kmIn: prevKm, kmOut: layer.outerKm, i });
      prev = rout;
      prevKm = layer.outerKm;
    });
    // keep the outer edge at OUTER by compressing inner shells if thin layers pushed it out
    const top = prev;
    if (top > OUTER) {
      const k = OUTER / top;
      for (const s of out) {
        s.rin *= k;
        s.rout *= k;
      }
    }
    return out;
  }, [interior]);

  const surface =
    id === "sun" ? maps.sun : id === "venus" ? maps.venus : id === "earth" ? maps.earth : maps[id as keyof typeof maps];
  const n = interior.layers.length;
  const cutSurface = useMemo(() => {
    const g = new THREE.SphereGeometry(OUTER * 1.002, 128, 96, 0, Math.PI * 1.5);
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, uv.getX(i) * 0.75);
    uv.needsUpdate = true;
    return g;
  }, []);
  useEffect(() => () => cutSurface.dispose(), [cutSurface]);


  return (
    <group>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4.2, 2.4, 3.2]} intensity={2.2} />
      <group ref={spin} rotation={[0, Math.PI, 0]}>
        <group rotation={[0, 0, THREE.MathUtils.degToRad(Math.min(body.obliquity, 30))]}>
          {shells.map((s) => {
            const layer = interior.layers[s.i];
            const glow = id === "sun" ? 1.4 - s.i * 0.25 : Math.max(0, 0.9 - (s.i / Math.max(1, n - 1)) * 1.3);
            return (
              <Layer
                key={layer.name}
                color={layer.color}
                deep={layer.deep}
                rin={s.rin}
                rout={s.i === n - 1 ? s.rout * 0.995 : s.rout}
                rough={layer.rough}
                glow={glow}
              />
            );
          })}
          {surface ? (
            <mesh geometry={cutSurface}>
              {id === "sun" ? (
                <meshBasicMaterial map={surface} color="#ffb060" toneMapped={false} />
              ) : (
                <meshStandardMaterial map={surface} roughness={0.95} metalness={0} />
              )}
            </mesh>
          ) : null}
          {shells.map((s, index) => {
            const layer = interior.layers[s.i];
            const mid = (s.rin + s.rout) / 2;
            const ang = THREE.MathUtils.degToRad(-55 + (110 * index) / Math.max(1, n - 1));
            const thick = s.kmOut - s.kmIn;
            return (
              <Html
                key={`${layer.name}-label`}
                position={[-mid * Math.cos(ang), mid * Math.sin(ang), 0.02]}
                center
                zIndexRange={[20, 0]}
                wrapperClass="tag-wrap"
                pointerEvents="none"
              >
                <div className="layer-tag">
                  <strong>{layer.name}</strong>
                  <span>{s.i === 0 ? `0–${fmtKm(s.kmOut)}` : `${fmtKm(thick)} thick`}</span>
                </div>
              </Html>
            );
          })}
        </group>
      </group>
    </group>
  );
}
