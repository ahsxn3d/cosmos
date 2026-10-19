"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { BODIES, BODY_ORDER, type BodyId } from "@/lib/bodies";
import { unixToJd } from "@/lib/julian";
import { live, liveMoon, livePositions } from "@/lib/live";
import { sampleSceneOrbit, scenePosition } from "@/lib/positions";
import { AU_SCENE, displayRadius, hitRadius, sizeFactor, visualRadius } from "@/lib/scale";
import { useExplorer } from "./context";
import { Missions } from "./missions";
import { MoonSystem } from "./moons";
import {
  AtmosphereMaterial,
  CloudMaterial,
  HI_COLOR,
  HI_EXTRA,
  HI_NORMAL,
  PlanetMaterial,
  RingMaterial,
  starFrag,
  starVert,
  SunMaterial,
  touchCenter,
  touchOcc,
  touchTime,
  useHiTexture,
  useMaps,
} from "./materials";

const TAU = Math.PI * 2;
const sunClock = { t: 0 };

const SPEC: Partial<Record<BodyId, { gain: number; power: number; bump: number }>> = {
  mercury: { gain: 0.05, power: 22, bump: 1.15 },
  venus: { gain: 0.03, power: 14, bump: 0 },
  earth: { gain: 0.9, power: 48, bump: 0 },
  moon: { gain: 0.06, power: 20, bump: 1.5 },
  mars: { gain: 0.07, power: 24, bump: 0.75 },
  jupiter: { gain: 0.22, power: 16, bump: 0 },
  saturn: { gain: 0.18, power: 16, bump: 0 },
  uranus: { gain: 0.16, power: 14, bump: 0 },
  neptune: { gain: 0.16, power: 14, bump: 0 },
  pluto: { gain: 0.05, power: 22, bump: 0.45 },
};

/**
 * Rim colors: Earth's blue limb and red terminator (Rayleigh), Venus' yellow
 * sulfuric haze, Mars' butterscotch dusty sky with blue sunsets (NASA
 * Curiosity/Perseverance imagery), Titan's orange tholin haze.
 */
const ATMOS: Partial<Record<BodyId, { color: string; strength: number; power: number; scale: number; sunset?: string }>> = {
  venus: { color: "#e6d3a4", strength: 0.95, power: 2.1, scale: 1.035, sunset: "#ffb85c" },
  earth: { color: "#6fa2ff", strength: 0.8, power: 2.5, scale: 1.035, sunset: "#ff8a4a" },
  mars: { color: "#e0a07a", strength: 0.42, power: 3.0, scale: 1.03, sunset: "#7fa6e6" },
  jupiter: { color: "#d9c7b0", strength: 0.28, power: 3.4, scale: 1.02 },
  saturn: { color: "#e4d2a8", strength: 0.26, power: 3.3, scale: 1.022 },
  uranus: { color: "#b7efe8", strength: 0.42, power: 2.8, scale: 1.035 },
  neptune: { color: "#7aa4ff", strength: 0.45, power: 2.7, scale: 1.035 },
};

function spinRate(id: BodyId): number {
  const body = BODIES[id];
  const days = Math.abs(body.rotationHours) / 24;
  if (days === 0) return 0;
  const turns = live.speed / days;
  const capped = Math.min(Math.abs(turns), 0.35);
  const sign = body.obliquity > 90 ? 1 : Math.sign(body.rotationHours) || 1;
  return capped * sign;
}

function useDetail() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const mobile = window.matchMedia("(max-width: 800px)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return !mobile && mem >= 4;
  }, []);
}

type PickEvent = { stopPropagation: () => void; intersections?: { object: THREE.Object3D; instanceId?: number }[] };

/** Moons win over their planet and rings: a click that also passes through a moon's hit area selects the moon. */
function moonUnder(event: PickEvent): string | null {
  for (const hit of event.intersections ?? []) {
    const pick = hit.object.userData?.pickMoon as ((k?: number) => string | null) | undefined;
    if (pick) {
      const id = pick(hit.instanceId);
      if (id) return id;
    }
  }
  return null;
}

function selectBody(id: BodyId, event: PickEvent) {
  event.stopPropagation();
  const moon = live.selected === id ? moonUnder(event) : null;
  if (moon) {
    window.dispatchEvent(new CustomEvent("anorix-moon", { detail: moon }));
    return;
  }
  live.selected = id;
  window.dispatchEvent(new CustomEvent("anorix-select", { detail: id }));
}

function hoverBody(id: BodyId, event: { stopPropagation: () => void }) {
  event.stopPropagation();
  live.hovered = id;
  document.body.style.cursor = "pointer";
}

function clearHover(id: BodyId) {
  if (live.hovered === id) live.hovered = null;
  document.body.style.cursor = "";
}

const glowCache: { tex: THREE.Texture | null } = { tex: null };
function makeGlow(): THREE.Texture {
    if (glowCache.tex) return glowCache.tex;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, "rgba(255,240,210,0.85)");
    grad.addColorStop(0.32, "rgba(255,190,110,0.32)");
    grad.addColorStop(0.55, "rgba(255,140,60,0.09)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    glowCache.tex = tex;
    return tex;
}

function useGlowTexture() {
  return useMemo(() => makeGlow(), []);
}

function BodyMesh({ id }: { id: BodyId }) {
  const maps = useMaps();
  const { selected } = useExplorer();
  const hiOk = useDetail();
  const focused = selected === id;
  const colorHi = useHiTexture(hiOk && focused ? (HI_COLOR[id] ?? null) : null);
  const nightHi = useHiTexture(hiOk && focused && id === "earth" ? HI_EXTRA.earthNight : null);
  const cloudHi = useHiTexture(
    hiOk && focused && id === "earth" ? HI_EXTRA.earthClouds : hiOk && focused && id === "venus" ? HI_EXTRA.venusClouds : null,
  );
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const globe = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const tilt = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Group>(null);
  const glowTex = useGlowTexture();
  const tag = useRef<HTMLDivElement>(null);
  const radius = visualRadius(id);
  const body = BODIES[id];
  const segments = id === "sun" ? 72 : focused ? 80 : 36;
  const spec = SPEC[id] ?? { gain: 0.08, power: 20, bump: 0 };
  const atmos = ATMOS[id];
  const axis = useMemo(() => {
    const tilt = THREE.MathUtils.degToRad(body.obliquity);
    // The tilt group rotates +obliquity about Z, which carries +Y to (-sin, cos, 0).
    return new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0);
  }, [body.obliquity]);

  const base =
    id === "sun" ? maps.sun : id === "venus" ? maps.venus : id === "earth" ? maps.earth : maps[id];
  const map = colorHi ?? base;
  const night = id === "earth" ? (nightHi ?? maps.earthNight) : null;
  const cloudMap = id === "earth" ? (cloudHi ?? maps.earthClouds) : id === "venus" ? (cloudHi ?? maps.venusClouds) : null;
  const ringInner = id === "saturn" ? radius * 1.22 : 0;
  const ringOuter = id === "saturn" ? radius * 2.35 : 0;

  useFrame((_, dt) => {
    const jd = unixToJd(live.simMs);
    const pos = scenePosition(id, jd);
    const target = livePositions[id];
    target.set(pos.x, pos.y, pos.z);
    if (root.current) root.current.position.copy(target);
    const k = sizeFactor(id);
    if (tilt.current && tilt.current.scale.x !== k) tilt.current.scale.setScalar(k);
    if (glow.current && glow.current.scale.x !== k) glow.current.scale.setScalar(k);
    const gm = globe.current?.material as THREE.ShaderMaterial | undefined;
    if (gm?.uniforms?.uRingOuter && ringOuter > 0) {
      gm.uniforms.uRingInner.value = ringInner * k;
      gm.uniforms.uRingOuter.value = ringOuter * k;
    }
    const rm = ring.current?.material as THREE.ShaderMaterial | undefined;
    if (rm?.uniforms?.uPlanetR) rm.uniforms.uPlanetR.value = radius * 0.98 * k;
    if (spin.current && live.playing) spin.current.rotation.y += spinRate(id) * TAU * dt;
    if (clouds.current && live.playing && !live.reduce) clouds.current.rotation.y += dt * 0.012;
    if (id === "sun" && live.playing && !live.reduce) sunClock.t += dt;
    const time = sunClock.t;
    if (id === "sun") {
      touchTime(globe.current?.material, time);
    } else {
      touchCenter(globe.current?.material, target);
      touchCenter(ring.current?.material, target);
      const occId = id === "moon" ? "earth" : id === "earth" ? "moon" : null;
      if (occId) touchOcc(globe.current?.material, livePositions[occId], displayRadius(occId));
    }
    const el = tag.current;
    if (!el) return;
    const on = live.selected === id;
    const hovered = live.hovered === id;
    el.dataset.on = on ? "1" : "0";
    el.style.opacity = (on && !liveMoon.id) || hovered ? "1" : "0";
  });

  const pointer = {
    onClick: (event: PickEvent) => selectBody(id, event),
    onPointerOver: (event: { stopPropagation: () => void }) => hoverBody(id, event),
    onPointerOut: () => clearHover(id),
  };

  return (
    <group ref={root}>
      <group ref={tilt} rotation={[0, 0, THREE.MathUtils.degToRad(body.obliquity)]}>
        <group ref={spin}>
          {id === "sun" ? (
            <mesh ref={globe} {...pointer}>
              <sphereGeometry args={[radius, segments, segments]} />
              <SunMaterial map={map} />
            </mesh>
          ) : (
            <mesh ref={globe} {...pointer}>
              <sphereGeometry args={[radius, segments, Math.max(24, segments - 8)]} />
              <PlanetMaterial
                map={map}
                night={night}
                cloud={cloudMap}
                axis={axis}
                ringInner={ringInner}
                ringOuter={ringOuter}
                ringMap={id === "saturn" ? maps.saturnRing : null}
                bump={spec.bump}
                specPower={spec.power}
                specGain={spec.gain}
                earth={id === "earth"}
                normalUrl={hiOk && focused ? (HI_NORMAL[id] ?? null) : null}
              />
            </mesh>
          )}
          {cloudMap ? (
            <mesh ref={clouds} raycast={() => null}>
              <sphereGeometry args={[radius * (id === "venus" ? 1.018 : 1.012), segments, Math.max(24, segments - 8)]} />
              <CloudMaterial map={cloudMap} opacity={id === "venus" ? 0.58 : 0.92} />
            </mesh>
          ) : null}
          {atmos ? (
            <mesh scale={radius * atmos.scale} raycast={() => null}>
              <sphereGeometry args={[1, 48, 32]} />
              <AtmosphereMaterial color={atmos.color} sunset={atmos.sunset} strength={atmos.strength} power={atmos.power} />
            </mesh>
          ) : null}
        </group>
        {id === "saturn" ? (
          <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} {...pointer}>
            <ringGeometry args={[ringInner, ringOuter, 160]} />
            <RingMaterial map={maps.saturnRing} inner={ringInner} outer={ringOuter} planetRadius={radius * 0.98} />
          </mesh>
        ) : null}
        {id === "uranus" ? (
          <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[radius * 1.7, radius * 1.98, 96]} />
            <meshBasicMaterial color="#8d8d8d" side={THREE.DoubleSide} transparent opacity={0.55} />
          </mesh>
        ) : null}
        {id !== "sun" && id !== "moon" && id !== "earth" ? <MoonSystem parent={id} /> : null}

      </group>
      {id === "sun" ? (
        <group ref={glow}>
          <sprite scale={radius * 7.5} raycast={() => null} renderOrder={5}>
            <spriteMaterial map={glowTex} color="#ffb46b" blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} opacity={0.9} />
          </sprite>
          <sprite scale={radius * 3.1} raycast={() => null} renderOrder={6}>
            <spriteMaterial map={glowTex} color="#fff2d6" blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} opacity={0.85} />
          </sprite>
        </group>
      ) : null}
      <mesh visible={false} {...pointer}>
        <sphereGeometry args={[hitRadius(id), 12, 12]} />
        <meshBasicMaterial />
      </mesh>
      <Html position={[0, radius * 1.55, 0]} center zIndexRange={[12, 0]} wrapperClass="tag-wrap" pointerEvents="none">
        <div ref={tag} className="body-tag" style={{ opacity: 0 }}>
          {body.name}
        </div>
      </Html>
    </group>
  );
}

function OrbitLine({ id }: { id: BodyId }) {
  const count = id === "moon" ? 96 : 192;
  const geom = useMemo(() => new THREE.BufferGeometry(), []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#6a645c" }), []);
  const line = useMemo(() => {
    const object = new THREE.Line(geom, mat);
    object.frustumCulled = false;
    object.raycast = () => undefined;
    return object;
  }, [geom, mat]);
  const bucket = useRef(-1);

  useEffect(() => {
    geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array((count + 1) * 3), 3));
    return () => {
      geom.dispose();
      mat.dispose();
    };
  }, [geom, mat, count]);

  useFrame(() => {
    const jd = unixToJd(live.simMs);
    const nextBucket = id === "moon" ? Math.floor(live.simMs / 80) : Math.floor(jd / 20);
    line.visible = live.showOrbits;
    mat.color.set(live.selected === id ? "#3b82f6" : "#6a645c");
    if (id !== "moon" && nextBucket === bucket.current) return;
    bucket.current = nextBucket;
    const attr = geom.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const pts = sampleSceneOrbit(id, jd, count);
    for (let i = 0; i < pts.length; i += 1) attr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
    attr.needsUpdate = true;
  });

  return <primitive object={line} />;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Asteroids() {
  const count = useMemo(() => (window.matchMedia("(max-width: 800px)").matches ? 320 : 720), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rocks = useMemo(() => {
    const rand = mulberry32(20261012);
    return Array.from({ length: count }, () => {
      const aAu = 2.15 + rand() * 1.15;
      return {
        a: aAu * AU_SCENE,
        e: rand() * 0.12,
        inc: (rand() - 0.5) * 0.22,
        om: rand() * TAU,
        w: rand() * TAU,
        m0: rand() * TAU,
        n: TAU / (Math.pow(aAu, 1.5) * 365.25),
        scale: 0.035 + rand() * 0.08,
      };
    });
  }, [count]);

  useEffect(() => {
    const object = mesh.current;
    if (!object) return;
    const color = new THREE.Color();
    const rand = mulberry32(99);
    for (let i = 0; i < count; i += 1) {
      color.setHSL(0.07, 0.08 + rand() * 0.12, 0.28 + rand() * 0.16);
      object.setColorAt(i, color);
    }
    if (object.instanceColor) object.instanceColor.needsUpdate = true;
    object.raycast = () => undefined;
  }, [count]);

  useFrame(() => {
    const object = mesh.current;
    if (!object) return;
    const days = (live.simMs - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
    for (let i = 0; i < rocks.length; i += 1) {
      const rock = rocks[i];
      const M = rock.m0 + rock.n * days;
      const E = M + rock.e * Math.sin(M);
      const x1 = rock.a * (Math.cos(E) - rock.e);
      const y1 = rock.a * Math.sqrt(1 - rock.e * rock.e) * Math.sin(E);
      const cosw = Math.cos(rock.w);
      const sinw = Math.sin(rock.w);
      const cosO = Math.cos(rock.om);
      const sinO = Math.sin(rock.om);
      const cosI = Math.cos(rock.inc);
      const sinI = Math.sin(rock.inc);
      const x = (cosw * cosO - sinw * sinO * cosI) * x1 + (-sinw * cosO - cosw * sinO * cosI) * y1;
      const y = (cosw * sinO + sinw * cosO * cosI) * x1 + (-sinw * sinO + cosw * cosO * cosI) * y1;
      const z = sinw * sinI * x1 + cosw * sinI * y1;
      dummy.position.set(x, z, y);
      dummy.scale.setScalar(rock.scale);
      dummy.rotation.set(rock.w, rock.om, 0);
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
    }
    object.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#b5a898" />
    </instancedMesh>
  );
}

function starGeometry(count: number, near: number, far: number, seed: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const rand = mulberry32(seed);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const radius = near + rand() * (far - near);
    const theta = rand() * TAU;
    const phi = Math.acos(2 * rand() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    seeds[i] = rand();
    const tone = rand();
    if (tone > 0.92) color.set("#f2d2b0");
    else if (tone > 0.78) color.set("#c9d4ff");
    else color.set("#f4f4f4");
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  return geo;
}

const twinkle = { t: 0 };

function StarShell({ count, near, far, seed }: { count: number; near: number; far: number; seed: number }) {
  const geometry = useMemo(() => starGeometry(count, near, far, seed), [count, near, far, seed]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: starVert,
        fragmentShader: starFrag,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const points = useRef<THREE.Points>(null);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(() => {
    if (live.playing && !live.reduce) twinkle.t += 1 / 120;
    touchTime(points.current?.material, twinkle.t);
  });
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

function Parallax({ factor, children }: { factor: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    ref.current.position.set(-camera.position.x * factor, -camera.position.y * factor, -camera.position.z * factor);
  });
  return <group ref={ref}>{children}</group>;
}

function Sky() {
  const maps = useMaps();
  const hiOk = useDetail();
  const hi = useHiTexture(hiOk ? HI_EXTRA.milkyway : null, true);
  const map = hi ?? maps.milkyway;
  return (
    <mesh renderOrder={-20} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[680, 48, 32]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} toneMapped={false} color="#b9b9b9" />
    </mesh>
  );
}

export function Backdrop({ sky = true }: { sky?: boolean }) {
  const rig = useRef<THREE.Group>(null);
  useFrame(({ camera }, dt) => {
    if (!rig.current) return;
    rig.current.position.copy(camera.position);
    if (!live.reduce && live.playing) rig.current.rotation.y += dt * 0.004;
  });
  const nearCount = useMemo(() => (window.matchMedia("(max-width: 800px)").matches ? 500 : 900), []);
  const farCount = useMemo(() => (window.matchMedia("(max-width: 800px)").matches ? 700 : 1400), []);
  return (
    <group ref={rig}>
      {sky ? <Sky /> : null}
      <Parallax factor={0.012}>
        <StarShell count={farCount} near={260} far={520} seed={11} />
      </Parallax>
      <Parallax factor={0.04}>
        <StarShell count={nearCount} near={120} far={240} seed={29} />
      </Parallax>
    </group>
  );
}

export function Orrery() {
  return (
    <group>
      <Backdrop />
      {BODY_ORDER.filter((id) => id !== "sun" && id !== "moon").map((id) => (
        <OrbitLine key={id} id={id} />
      ))}
      <OrbitLine id="moon" />
      <Asteroids />
      {BODY_ORDER.map((id) => (
        <BodyMesh key={id} id={id} />
      ))}
      <Missions />
    </group>
  );
}
