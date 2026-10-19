"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { BodyId } from "@/lib/bodies";
import { live, liveMoon, moonPositions } from "@/lib/live";
import { MOON_MAPS, minorMoonsOf, moonOrbitRadius, moonsOf, moonVisualRadius, type MoonData } from "@/lib/moons";
import { AtmosphereMaterial } from "./materials";

const TAU = Math.PI * 2;

const vert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vObj = normalize(position);
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
  }
`;

const frag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uKind;
  uniform float uSeed;
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec3 uTint;
  uniform float uHover;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vPosW;
  varying vec2 vUv;
  float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * n3(p); p *= 2.07; a *= 0.5; } return v; }
  // cellular craters
  float craters(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); float d = 1.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = vec3(h3(i + g), h3(i + g + 7.1), h3(i + g + 13.7));
      d = min(d, length(g + o - f));
    }
    return d;
  }
  void main() {
    vec3 p = vObj * 3.0 + uSeed;
    float base = fbm(p * 1.4);
    vec3 col = mix(uAccent, uColor, smoothstep(0.25, 0.75, base));
    float c = craters(p * 2.2);
    float rim = smoothstep(0.18, 0.24, c) * (1.0 - smoothstep(0.24, 0.32, c));
    float pit = 1.0 - smoothstep(0.0, 0.2, c);
    float crater = rim * 0.18 - pit * 0.14;
    if (uKind < 0.5) { // cratered rock / ice
      col *= 1.0 + crater * 1.2;
    } else if (uKind < 1.5) { // volcanic (Io)
      float spot = smoothstep(0.62, 0.7, fbm(p * 2.6));
      col = mix(col, vec3(0.12, 0.07, 0.04), spot);
      col = mix(col, vec3(0.95, 0.55, 0.15), smoothstep(0.72, 0.8, fbm(p * 3.1 + 4.0)) * 0.6);
    } else if (uKind < 2.5) { // ocean world: lineae
      float l = abs(sin(dot(vObj, vec3(9.0, 3.0, 5.0)) + fbm(p * 2.0) * 6.0));
      col = mix(col, uAccent, (1.0 - smoothstep(0.0, 0.08, l)) * 0.7);
      col *= 1.0 + crater * 0.3;
    } else if (uKind < 3.5) { // two-tone (Iapetus)
      float dark = smoothstep(-0.2, 0.25, vObj.x + fbm(p) * 0.4 - 0.2);
      col = mix(uColor, uAccent, dark);
      col *= 1.0 + crater;
    } else { // hazy (Titan)
      col = mix(uAccent, uColor, 0.55 + 0.25 * sin(vObj.y * 6.0 + fbm(p) * 2.0));
    }
    if (uHasMap > 0.5) {
      vec3 m = texture2D(uMap, vUv).rgb;
      col = m * uTint;
    }
    vec3 N = normalize(vN);
    vec3 L = normalize(-vPosW);
    float ndl = dot(N, L);
    float lit = smoothstep(-0.05, 0.25, ndl) * (0.25 + 0.75 * max(ndl, 0.0));
    vec3 outc = col * (0.025 + lit * 1.15) * (1.0 + uHover * 0.45) + vec3(0.06, 0.12, 0.25) * uHover;
    gl_FragColor = vec4(outc, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

function kindOf(moon: MoonData): number {
  if (moon.id === "io") return 1;
  if (moon.id === "iapetus") return 3;
  if (moon.id === "titan") return 4;
  if (moon.type === "Ocean world") return 2;
  return 0;
}

function MoonBody({ moon, selectMoon }: { moon: MoonData; selectMoon: (id: string) => void }) {
  const pivot = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const tag = useRef<HTMLDivElement>(null);
  const ring = useRef<THREE.LineLoop>(null);
  const orbit = moonOrbitRadius(moon);
  const radius = moonVisualRadius(moon);
  const irregular = Boolean(moon.axesKm) || moon.radiusKm < 150;
  const seed = useMemo(() => {
    let h = 0;
    for (const ch of moon.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return h / 997;
  }, [moon.id]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(moon.color) },
          uAccent: { value: new THREE.Color(moon.accent) },
          uKind: { value: kindOf(moon) },
          uSeed: { value: seed * 40 },
          uMap: { value: null },
          uHasMap: { value: 0 },
          uHover: { value: 0 },
          uTint: { value: new THREE.Color(MOON_MAPS[moon.id]?.tint ?? "#ffffff") },
        },
        vertexShader: vert,
        fragmentShader: frag,
        toneMapped: false,
      }),
    [moon, seed],
  );
  const geometry = useMemo(() => {
    const g = MOON_MAPS[moon.id] && !irregular ? new THREE.SphereGeometry(radius, 64, 40) : new THREE.IcosahedronGeometry(radius, irregular ? 4 : 5);
    if (irregular) {
      const pos = g.getAttribute("position") as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i);
        const n = Math.sin(v.x * 31 + seed * 9) * Math.cos(v.y * 27) * Math.sin(v.z * 23 + seed);
        // Real triaxial proportions (long axis points at the planet), plus gentle relief.
        const ax = moon.axesKm ?? [1.25, 0.85, 0.95];
        const mean = moon.axesKm ? Math.cbrt(ax[0] * ax[1] * ax[2]) : 1;
        v.multiplyScalar(1 + n * 0.09).multiply(new THREE.Vector3(ax[0] / mean, ax[2] / mean, ax[1] / mean));
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
    }
    return g;
  }, [radius, irregular, seed]);
  const ringGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 160; i += 1) {
      const a = (i / 160) * TAU;
      pts.push(new THREE.Vector3(Math.cos(a) * orbit, 0, Math.sin(a) * orbit));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [orbit]);
  const ringMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#8a8a8a", transparent: true, opacity: 0.3 }), []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    },
    [material, geometry, ringGeo, ringMat],
  );
  // Lazy: a moon's photo map loads the first time its planet is focused.
  const wantMap = useRef(false);
  const loadMap = () => {
    const entry = MOON_MAPS[moon.id];
    if (!entry || wantMap.current) return;
    wantMap.current = true;
    new THREE.TextureLoader().load(entry.url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      material.uniforms.uMap.value = tex;
      material.uniforms.uHasMap.value = 1;
    });
  };
  useEffect(
    () => () => {
      (material.uniforms.uMap.value as THREE.Texture | null)?.dispose();
    },
    [material],
  );
  const phase = useRef(seed * TAU);
  const hover = useRef(false);
  const world = useMemo(() => {
    const v = new THREE.Vector3();
    moonPositions[moon.id] = v;
    return v;
  }, [moon.id]);

  useFrame((_, dt) => {
    if (live.playing) {
      const rate = (TAU / Math.abs(moon.periodDays)) * live.speed;
      const capped = Math.min(rate, TAU * 0.08) * Math.sign(moon.periodDays);
      phase.current += capped * Math.min(dt, 0.05);
    }
    if (pivot.current) pivot.current.rotation.y = -phase.current;
    if (mesh.current) {
      mesh.current.getWorldPosition(world);
      mesh.current.rotation.y = phase.current; // tidally locked
    }
    const parentOn = live.selected === moon.parent;
    const on = liveMoon.id === moon.id;
    if (parentOn) loadMap();
    if (ring.current) {
      ring.current.visible = parentOn && live.showOrbits;
      ringMat.color.set(on ? "#3b82f6" : "#8a8a8a");
      ringMat.opacity = on ? 0.7 : 0.28;
    }
    const el = tag.current;
    if (el) {
      el.dataset.on = on ? "1" : "0";
      el.style.opacity = !on && (parentOn || hover.current) ? "1" : "0";
      el.style.color = hover.current ? "#3b82f6" : "";
    }
    material.uniforms.uHover.value += ((hover.current ? 1 : 0) - material.uniforms.uHover.value) * 0.25;
    if (ring.current && hover.current) {
      ring.current.visible = true;
      ringMat.color.set("#3b82f6");
    }
  });

  const pointer = {
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      selectMoon(moon.id);
    },
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      hover.current = true;
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      hover.current = false;
      document.body.style.cursor = "";
    },
  };

  return (
    <group>
      <lineLoop ref={ring} geometry={ringGeo} material={ringMat} raycast={() => null} visible={false} />
      <group ref={pivot}>
        <group position={[orbit, 0, 0]}>
          <mesh ref={mesh} geometry={geometry} material={material} {...pointer} />
          {moon.id === "titan" ? (
            <mesh scale={radius * 1.06} raycast={() => null}>
              <sphereGeometry args={[1, 40, 28]} />
              <AtmosphereMaterial color="#e0a24c" sunset="#c7782c" strength={0.9} power={2.2} />
            </mesh>
          ) : null}
          <mesh visible={false} {...pointer} userData={{ pickMoon: () => moon.id }}>
            <sphereGeometry args={[Math.max(radius * 3.2, 0.32), 10, 10]} />
            <meshBasicMaterial />
          </mesh>
          <Html position={[0, radius * 1.9 + 0.06, 0]} center zIndexRange={[12, 0]} wrapperClass="tag-wrap" pointerEvents="none">
            <div ref={tag} className="body-tag body-tag-moon" style={{ opacity: 0 }}>
              {moon.name}
            </div>
          </Html>
        </group>
      </group>
    </group>
  );
}

export function MoonSystem({ parent }: { parent: BodyId }) {
  const list = useMemo(() => moonsOf(parent), [parent]);
  if (list.length === 0 && minorMoonsOf(parent).length === 0) return null;
  const selectMoon = (id: string) => {
    window.dispatchEvent(new CustomEvent("anorix-moon", { detail: id }));
  };
  return (
    <>
      {list.map((moon) => (
        <MoonBody key={moon.id} moon={moon} selectMoon={selectMoon} />
      ))}
      <MinorMoons parent={parent} />
    </>
  );
}

/** World positions of the instanced moons (debug/QA, and for any overlay). */
export const minorWorld: Record<string, THREE.Vector3> = {};
if (typeof window !== "undefined") (window as unknown as { __minor: unknown }).__minor = minorWorld;

const J2000 = Date.UTC(2000, 0, 1, 12);
const D2R = Math.PI / 180;

/** Keplerian position from JPL mean elements, km, in the reference plane (y up). */
function keplerKm(m: MoonData, days: number, out: THREE.Vector3) {
  const o = m.minor!;
  const P = Math.abs(m.periodDays);
  const M = (o.M + (360 / P) * days) * D2R;
  let E = M;
  for (let k = 0; k < 6; k += 1) E -= (E - o.e * Math.sin(E) - M) / (1 - o.e * Math.cos(E));
  const xv = m.aKm * (Math.cos(E) - o.e);
  const yv = m.aKm * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
  const v = Math.atan2(yv, xv) + o.w * D2R;
  const r = Math.hypot(xv, yv);
  const N = o.node * D2R;
  const I = o.i * D2R;
  const x = r * (Math.cos(N) * Math.cos(v) - Math.sin(N) * Math.sin(v) * Math.cos(I));
  const z = r * (Math.sin(N) * Math.cos(v) + Math.cos(N) * Math.sin(v) * Math.cos(I));
  const y = r * Math.sin(v) * Math.sin(I);
  return out.set(x, y, -z);
}

/** Same log compression the major moons use, applied to the instantaneous distance. */
function squash(parent: BodyId, km: THREE.Vector3, out: THREE.Vector3) {
  const d = km.length();
  const scaled = moonOrbitRadius({ parent, aKm: d } as MoonData);
  return out.copy(km).multiplyScalar(scaled / Math.max(d, 1));
}

/**
 * Every other JPL-catalogued satellite of a planet: one instanced mesh, real
 * elements (inclination, eccentricity, retrograde motion) advanced to the
 * simulation date, sized by measured radius where JPL has one.
 */
function MinorMoons({ parent }: { parent: BodyId }) {
  const list = useMemo(() => minorMoonsOf(parent), [parent]);
  const root = useRef<THREE.Group>(null);
  const vis = useRef<THREE.InstancedMesh>(null);
  const hit = useRef<THREE.InstancedMesh>(null);
  const tagEl = useRef<HTMLDivElement>(null);
  const tagGroup = useRef<THREE.Group>(null);
  const hovered = useRef(-1);
  const sizes = useMemo(() => list.map((m) => moonVisualRadius(m)), [list]);
  // Lumpy, cratered rock: noise-displaced icosphere; each instance gets its own spin so shapes differ.
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 3);
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i).normalize();
      const n = Math.sin(v.x * 5.1 + 1.3) * Math.cos(v.y * 4.3) * 0.12 + Math.sin(v.z * 11.7 + v.x * 7.9) * 0.05;
      const crater = Math.max(0, Math.cos(v.angleTo(new THREE.Vector3(0.6, 0.5, 0.62).normalize()) * 7) - 0.6) * -0.12;
      v.multiply(new THREE.Vector3(1.22, 0.86, 0.95)).multiplyScalar(1 + n + crater);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b3aca2", emissive: "#1d1b18", roughness: 1, metalness: 0 }), []);
  const spins = useMemo(() => list.map((_, k) => new THREE.Euler(k * 1.7, k * 2.3, k * 0.9)), [list]);
  const light = useRef<THREE.PointLight>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const labelGroups = useRef<(THREE.Group | null)[]>([]);
  const [allNames, setAllNames] = useState(false);
  const hitMat = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), []);
  const orbitGeo = useMemo(() => {
    const pts: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (const m of list) {
      const P = Math.abs(m.periodDays);
      for (let k = 0; k < 96; k += 1) {
        squash(parent, keplerKm(m, (k / 96) * P - (m.minor!.M / 360) * P, s), a);
        squash(parent, keplerKm(m, ((k + 1) / 96) * P - (m.minor!.M / 360) * P, s), b);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [list, parent]);
  const orbitMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#7c8796", transparent: true, opacity: 0.035, depthWrite: false }), []);
  const orbits = useRef<THREE.LineSegments>(null);
  const focusLine = useRef<THREE.LineLoop>(null);
  const focusIdx = useRef(-2);
  const focusGeo = useMemo(() => new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(128 * 3), 3)), []);
  const focusMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#3b82f6", transparent: true, opacity: 0.75, depthWrite: false }), []);
  const tmp = useMemo(() => ({ km: new THREE.Vector3(), p: new THREE.Vector3(), o: new THREE.Object3D(), w: new THREE.Vector3() }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); hitMat.dispose(); orbitGeo.dispose(); orbitMat.dispose(); }, [geo, mat, hitMat, orbitGeo, orbitMat]);

  useFrame(({ camera }) => {
    const g = root.current;
    if (!g || !vis.current || !hit.current) return;
    const wantNames = live.showMoonNames && live.selected === parent;
    if (allNames !== wantNames) setAllNames(wantNames);
    const parentOn = live.selected === parent;
    g.visible = parentOn;
    if (!parentOn) return;
    g.updateWorldMatrix(true, false);
    const days = (live.simMs - J2000) / 86_400_000;
    let labelIdx = -1;
    for (let k = 0; k < list.length; k += 1) {
      const m = list[k];
      squash(parent, keplerKm(m, days, tmp.km), tmp.p);
      const sel = liveMoon.id === m.id;
      // Never smaller than ~0.5% of the camera distance, so every moon reads as a body.
      tmp.w.copy(tmp.p).applyMatrix4(g.matrixWorld);
      const minR = camera.position.distanceTo(tmp.w) * 0.0055;
      const r = Math.max(sizes[k], minR) * (sel || hovered.current === k ? 1.6 : 1);
      tmp.o.position.copy(tmp.p);
      tmp.o.rotation.copy(spins[k]);
      const lg = labelGroups.current[k];
      if (lg) lg.position.copy(tmp.p).add(tmp.km.set(0, r * 1.8, 0));
      tmp.o.scale.setScalar(r);
      tmp.o.updateMatrix();
      vis.current.setMatrixAt(k, tmp.o.matrix);
      tmp.o.scale.setScalar(Math.max(r * 4, 0.16));
      tmp.o.updateMatrix();
      hit.current.setMatrixAt(k, tmp.o.matrix);
      (minorWorld[m.id] ??= new THREE.Vector3()).copy(tmp.p).applyMatrix4(g.matrixWorld);
      if (sel) {
        const w = moonPositions[m.id] ?? (moonPositions[m.id] = new THREE.Vector3());
        w.copy(tmp.p).applyMatrix4(g.matrixWorld);
        labelIdx = k;
      }
      if (hovered.current === k) labelIdx = k;
      if (labelIdx === k && tagGroup.current) tagGroup.current.position.copy(tmp.p).add(tmp.w.set(0, r * 2 + 0.05, 0));
    }
    tmp.o.rotation.set(0, 0, 0);
    if (light.current) light.current.position.copy(g.worldToLocal(tmp.w.set(0, 0, 0)));
    vis.current.instanceMatrix.needsUpdate = true;
    hit.current.instanceMatrix.needsUpdate = true;
    hit.current.computeBoundingSphere();
    vis.current.computeBoundingSphere();
    if (orbits.current) orbits.current.visible = live.showOrbits;
    // Only the hovered or selected small moon gets a bright orbit; the rest stay faint.
    const fk = hovered.current >= 0 ? hovered.current : list.findIndex((m) => m.id === liveMoon.id);
    if (fk !== focusIdx.current && focusLine.current) {
      focusIdx.current = fk;
      if (fk >= 0) {
        const m = list[fk];
        const P = Math.abs(m.periodDays);
        const arr = focusGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let k = 0; k < 128; k += 1) {
          squash(parent, keplerKm(m, (k / 128) * P - (m.minor!.M / 360) * P, tmp.km), tmp.p);
          arr.setXYZ(k, tmp.p.x, tmp.p.y, tmp.p.z);
        }
        arr.needsUpdate = true;
        focusGeo.computeBoundingSphere();
      }
    }
    if (focusLine.current) focusLine.current.visible = fk >= 0;
    if (tagEl.current) {
      tagEl.current.textContent = labelIdx >= 0 ? list[labelIdx].name : "";
      tagEl.current.style.opacity = labelIdx >= 0 ? "1" : "0";
    }
  });

  if (list.length === 0) return null;
  const idOf = (e: { instanceId?: number }) => (e.instanceId == null ? -1 : e.instanceId);
  return (
    <group ref={root} visible={false}>
      <lineSegments ref={orbits} geometry={orbitGeo} material={orbitMat} raycast={() => null} />
      <lineLoop ref={focusLine} geometry={focusGeo} material={focusMat} raycast={() => null} visible={false} />
      <instancedMesh ref={vis} args={[geo, mat, list.length]} raycast={() => null} frustumCulled={false} />
      <instancedMesh
        ref={hit}
        args={[geo, hitMat, list.length]}
        frustumCulled={false}
        userData={{ pickMoon: (k?: number) => (k == null ? null : list[k]?.id ?? null) }}
        onClick={(e) => {
          const k = idOf(e);
          if (k < 0) return;
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("anorix-moon", { detail: list[k].id }));
        }}
        onPointerMove={(e) => {
          const k = idOf(e);
          if (k < 0) return;
          e.stopPropagation();
          hovered.current = k;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hovered.current = -1;
          document.body.style.cursor = "";
        }}
      />
      <pointLight ref={light} intensity={2.2} decay={0} distance={0} />
      {allNames
        ? list.map((m, k) => (
            <group key={m.id} ref={(el) => { labelGroups.current[k] = el; }}>
              <Html center zIndexRange={[11, 0]} wrapperClass="tag-wrap" pointerEvents="none">
                <div ref={(el) => { labels.current[k] = el; }} className="body-tag body-tag-moon moon-name-all">{m.name}</div>
              </Html>
            </group>
          ))
        : null}
      <group ref={tagGroup}>
        <Html center zIndexRange={[12, 0]} wrapperClass="tag-wrap" pointerEvents="none">
          <div ref={tagEl} className="body-tag body-tag-moon" style={{ opacity: 0 }} />
        </Html>
      </group>
    </group>
  );
}
