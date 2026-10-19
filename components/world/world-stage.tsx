"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES, type BodyId } from "@/lib/bodies";
import { live, liveMoon, moonPositions } from "@/lib/live";
import { moonById, moonVisualRadius } from "@/lib/moons";
import { moonOrbitScene, visualRadius } from "@/lib/scale";
import { AnatomyView } from "@/components/explorer/anatomy";
import {
  AtmosphereMaterial,
  CloudMaterial,
  MapGate,
  HI_COLOR,
  HI_EXTRA,
  HI_NORMAL,
  useHiTexture,
  PlanetMaterial,
  RingMaterial,
  SunMaterial,
  touchCenter,
  touchTime,
  useMaps,
} from "@/components/explorer/materials";
import { MoonSystem } from "@/components/explorer/moons";
import { Backdrop } from "@/components/explorer/orrery";

/** The planet sits away from the origin so the shared shaders' Sun (origin) lights it from the side. */
const P = new THREE.Vector3(-40, 0, 0);

const ATM: Partial<Record<BodyId, [string, string, number]>> = {
  earth: ["#6fa2ff", "#ff8a4a", 0.8],
  venus: ["#e6d3a4", "#ffb85c", 0.95],
  mars: ["#e0a07a", "#7fa6e6", 0.42],
  jupiter: ["#d9c7b0", "#d9c7b0", 0.28],
  saturn: ["#e4d2a8", "#e4d2a8", 0.26],
  uranus: ["#b7efe8", "#b7efe8", 0.42],
  neptune: ["#7aa4ff", "#7aa4ff", 0.45],
};

function Planet({ id }: { id: BodyId }) {
  const maps = useMaps();
  const body = BODIES[id];
  const r = visualRadius(id);
  const ring = useRef<THREE.Mesh>(null);
  const globe = useRef<THREE.Mesh>(null);
  const spin = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Group>(null);
  const tilt = THREE.MathUtils.degToRad(body.obliquity);
  const axis = useMemo(() => new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0), [tilt]);
  const map0 = id === "sun" ? maps.sun : id === "venus" ? maps.venus : id === "earth" ? maps.earth : maps[id as keyof typeof maps];
  const hiMap = useHiTexture(HI_COLOR[id] ?? null);
  const hiCloud = useHiTexture(id === "earth" ? HI_EXTRA.earthClouds : id === "venus" ? HI_EXTRA.venusClouds : null);
  const hiNight = useHiTexture(id === "earth" ? HI_EXTRA.earthNight : null);
  const map = hiMap ?? map0;
  const cloud = hiCloud ?? (id === "earth" ? maps.earthClouds : id === "venus" ? maps.venusClouds : null);
  const atm = ATM[id];
  const ri = r * 1.22;
  const ro = r * 2.35;
  useFrame((_, dt) => {
    touchCenter(globe.current?.material, P);
    touchCenter(ring.current?.material, P);
    if (id === "sun") touchTime(globe.current?.material, performance.now() / 1000);
    if (spin.current && live.playing) spin.current.rotation.y += dt * 0.05;
    if (moon.current && live.playing) moon.current.rotation.y += dt * 0.08;
  });
  return (
    <group position={P}>
      <group rotation={[0, 0, tilt]}>
        <group ref={spin}>
          <mesh ref={globe}>
            <sphereGeometry args={[r, 128, 96]} />
            {id === "sun" ? (
              <SunMaterial map={map} />
            ) : (
              <PlanetMaterial
                normalUrl={HI_NORMAL[id] ?? null}
                map={map}
                night={id === "earth" ? (hiNight ?? maps.earthNight) : null}
                cloud={cloud}
                axis={axis}
                ringInner={id === "saturn" ? ri : 0}
                ringOuter={id === "saturn" ? ro : 0}
                ringMap={id === "saturn" ? maps.saturnRing : null}
                bump={id === "mercury" || id === "moon" ? 1.3 : id === "mars" ? 0.75 : 0}
                specPower={id === "earth" ? 48 : 20}
                specGain={id === "earth" ? 0.9 : 0.06}
                earth={id === "earth"}
              />
            )}
          </mesh>
          {cloud ? (
            <mesh>
              <sphereGeometry args={[r * (id === "venus" ? 1.018 : 1.012), 96, 64]} />
              <CloudMaterial map={cloud} opacity={id === "venus" ? 0.58 : 0.92} />
            </mesh>
          ) : null}
          {atm ? (
            <mesh scale={r * 1.035}>
              <sphereGeometry args={[1, 64, 48]} />
              <AtmosphereMaterial color={atm[0]} sunset={atm[1]} strength={atm[2]} power={2.6} />
            </mesh>
          ) : null}
        </group>
        {id === "saturn" ? (
          <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[ri, ro, 200]} />
            <RingMaterial map={maps.saturnRing} inner={ri} outer={ro} planetRadius={r * 0.98} />
          </mesh>
        ) : null}
        {id !== "sun" && id !== "earth" && id !== "moon" ? <MoonSystem parent={id} /> : null}
      </group>
      {id === "earth" ? (
        <group ref={moon}>
          <mesh position={[moonOrbitScene(), 0, 0]}>
            <sphereGeometry args={[visualRadius("moon"), 64, 48]} />
            <PlanetMaterial map={maps.moon} bump={1.3} normalUrl={HI_NORMAL.moon} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Rig({ mode, focusMoon, dist }: { mode: "surface" | "cutaway"; focusMoon: string | null; dist: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const last = useRef(new THREE.Vector3());
  useEffect(() => {
    if (!controls) return;
    const t = mode === "cutaway" ? new THREE.Vector3() : focusMoon && moonPositions[focusMoon] ? moonPositions[focusMoon].clone() : P.clone();
    controls.target.copy(t);
    camera.position.copy(t).add(mode === "cutaway" ? new THREE.Vector3(3.35, 1.2, 2.55) : new THREE.Vector3(dist * 0.62, dist * 0.28, dist));
    last.current.copy(t);
    controls.update();
  }, [mode, focusMoon, dist, camera, controls]);
  useFrame(() => {
    if (!controls || mode !== "surface" || !focusMoon) return;
    const p = moonPositions[focusMoon];
    if (!p) return;
    const d = p.clone().sub(last.current);
    camera.position.add(d);
    controls.target.add(d);
    last.current.copy(p);
    controls.update();
  });
  return null;
}

export function WorldStage({ id, mode, moonId = null }: { id: BodyId; mode: "surface" | "cutaway"; moonId?: string | null }) {
  useEffect(() => {
    live.selected = id;
    live.scene = "orrery";
    liveMoon.id = moonId;
  }, [id, moonId]);
  const m = moonById(moonId);
  const dist = m ? Math.max(moonVisualRadius(m) * 9, 0.4) : visualRadius(id) * (id === "saturn" ? 4.6 : MOON_FRAME[id] ?? 3.2);
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 38, near: 0.01, far: 4000, position: [0, 2, 8] }}
      gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.setClearColor("#000000", 1);
      }}
    >
      <Suspense fallback={null}>
        <MapGate>
          <Backdrop />
          {mode === "cutaway" ? <AnatomyView bodyId={id} /> : <Planet id={id} />}
          <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={0.05} maxDistance={400} />
          <Rig mode={mode} focusMoon={m?.id ?? null} dist={dist} />
        </MapGate>
      </Suspense>
    </Canvas>
  );
}

const MOON_FRAME: Partial<Record<BodyId, number>> = { jupiter: 4.2, uranus: 5, neptune: 5, mars: 6, pluto: 6 };
