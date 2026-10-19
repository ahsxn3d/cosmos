"use client";

import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SIM_MAX, SIM_MIN } from "@/lib/julian";
import { live, liveMoon, livePositions, missionPositions, moonPositions } from "@/lib/live";
import { displayRadius } from "@/lib/scale";
import { AnatomyView } from "./anatomy";
import { BeyondView } from "./beyond-view";
import { useExplorer } from "./context";
import { FormationView } from "./formation";
import { MapGate } from "./materials";
import { Backdrop, Orrery } from "./orrery";

function dampVec(current: THREE.Vector3, target: THREE.Vector3, smooth: number, dt: number) {
  const k = 1 - Math.exp(-dt / Math.max(0.0001, smooth));
  current.lerp(target, k);
}

type OrbitLike = {
  target: THREE.Vector3;
  update: () => void;
  minDistance: number;
  maxDistance: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function smootherstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function focusPos(): THREE.Vector3 {
  const mid = liveMoon.id;
  if (mid && moonPositions[mid]) return moonPositions[mid];
  if (!live.selected && live.mission && missionPositions[live.mission]) return missionPositions[live.mission];
  return livePositions[live.selected ?? "sun"];
}

function focused() {
  return live.scene === "orrery" && Boolean(live.selected || live.mission);
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  if (typeof window !== "undefined") (window as unknown as { __cam: unknown }).__cam = camera;
  const controls = useThree((state) => state.controls) as unknown as OrbitLike | null;
  const { scene, beyond } = useExplorer();
  const dragging = useRef(false);
  const offset = useRef(new THREE.Vector3(18, 12, 30));
  const scratch = useRef(new THREE.Vector3());
  const radial = useRef(new THREE.Vector3());
  const flight = useRef({
    active: false,
    t: 0,
    dur: 1.2,
    arc: 0,
    fromP: new THREE.Vector3(),
    fromT: new THREE.Vector3(),
    toP: new THREE.Vector3(),
    toT: new THREE.Vector3(),
  });
  const key = useRef("orrery||milkyway|0");

  useEffect(() => {
    if (!controls) return;
    if (scene === "orrery") {
      controls.minDistance = 0.12;
      controls.maxDistance = 7200;
    } else if (scene === "beyond" && beyond === "universe") {
      controls.minDistance = 20;
      controls.maxDistance = 400;
    } else if (scene === "beyond" && beyond === "milkyway") {
      controls.minDistance = 40;
      controls.maxDistance = 380;
    } else if (scene === "anatomy") {
      controls.minDistance = 2.2;
      controls.maxDistance = 8.5;
    } else {
      controls.minDistance = 1.6;
      controls.maxDistance = 16;
    }
  }, [controls, scene, beyond]);

  useEffect(() => {
    if (!controls) return;
    const start = () => {
      dragging.current = true;
      flight.current.active = false;
    };
    const end = () => {
      dragging.current = false;
      const sel = live.selected;
      if ((sel || live.mission) && live.scene === "orrery") {
        offset.current.copy(camera.position).sub(controls.target);
      }
    };
    controls.addEventListener("start", start);
    controls.addEventListener("end", end);
    return () => {
      controls.removeEventListener("start", start);
      controls.removeEventListener("end", end);
    };
  }, [controls, camera]);

  useFrame((_, dt) => {
    if (!controls || dragging.current) return;
    const token = `${live.scene}|${live.selected ?? ""}|${liveMoon.id ?? ""}|${live.mission ?? ""}|${live.trueScale}|${live.beyond}|${live.frameNonce}`;
    if (token !== key.current) {
      key.current = token;
      const f = flight.current;
      f.fromP.copy(camera.position);
      f.fromT.copy(controls.target);
      if (focused()) {
        const mid = liveMoon.id;
        const radius = mid ? liveMoon.radius : live.selected ? displayRadius(live.selected) : 0.05;
        const dist = live.trueScale && !mid ? Math.max(radius * 4, 0.0004) : mid ? Math.max(radius * 7, 0.7) : live.selected ? Math.max(radius * 3.8, 1.9) : 1.4;
        const cam = camera as THREE.PerspectiveCamera;
        const near = live.trueScale ? Math.max(radius * 0.05, 0.00002) : 0.05;
        if (cam.near !== near) {
          cam.near = near;
          cam.updateProjectionMatrix();
        }
        controls.minDistance = live.trueScale ? Math.max(radius * 1.15, 0.00004) : 0.12;
        const from = scratch.current.copy(camera.position).sub(controls.target);
        if (from.lengthSq() < 1e-4) from.set(0.62, 0.42, 1);
        from.y = Math.max(from.y, dist * 0.28);
        from.setLength(dist);
        offset.current.copy(from);
        const pos = focusPos();
        f.toT.copy(pos);
        f.toP.copy(pos).add(offset.current);
      } else {
        const cam = camera as THREE.PerspectiveCamera;
        if (cam.near !== 0.05) {
          cam.near = 0.05;
          cam.updateProjectionMatrix();
        }
        if (live.scene === "orrery") controls.minDistance = 0.12;
        f.toT.set(0, 0, 0);
        if (live.scene === "anatomy") f.toP.set(3.35, 1.2, 2.55);
        else if (live.scene === "formation") f.toP.set(0.35, 2.45, 5.5);
        else if (live.scene === "beyond" && live.beyond === "milkyway") f.toP.set(52, 74, 138);
        else if (live.scene === "beyond" && live.beyond === "universe") f.toP.set(0, 42, 98);
        else if (live.scene === "beyond" && live.beyond === "proxima") f.toP.set(0.2, 1.35, 4.7);
        else if (live.scene === "beyond") f.toP.set(0.2, 1.75, 4.5);
        else if (live.frameKind === "inner") f.toP.set(0, 34, 82);
        else if (live.frameKind === "full") f.toP.set(0, 1180, 2680);
        else f.toP.set(0, 96, 220);
      }
      const dist = f.fromP.distanceTo(f.toP);
      f.t = 0;
      f.dur = live.reduce ? 0.01 : THREE.MathUtils.clamp(dist / 150, 1.05, 2.55);
      f.arc = live.reduce ? 0 : Math.min(42, dist * 0.15);
      f.active = dist > 0.2;
    }

    const f = flight.current;
    if (f.active) {
      f.t += dt;
      if (focused()) {
        const pos = focusPos();
        f.toT.copy(pos);
        f.toP.copy(pos).add(offset.current);
      }
      const e = smootherstep(f.t / f.dur);
      const pos = scratch.current.copy(f.fromP).lerp(f.toP, e);
      const lift = Math.sin(Math.min(e, 1) * Math.PI);
      radial.current.set(pos.x, 0, pos.z);
      if (radial.current.lengthSq() > 4) {
        const extra = lift * Math.min(16, f.arc * 0.35);
        const len = radial.current.length();
        radial.current.multiplyScalar((len + extra) / len);
        pos.x = radial.current.x;
        pos.z = radial.current.z;
      }
      pos.y += lift * f.arc;
      camera.position.copy(pos);
      controls.target.copy(f.fromT).lerp(f.toT, e);
      controls.update();
      if (e >= 1) f.active = false;
      return;
    }

    if (focused()) {
      const pos = focusPos();
      const smooth = live.reduce || liveMoon.id ? 0.0001 : 0.55;
      dampVec(controls.target, pos, smooth, dt);
      dampVec(camera.position, scratch.current.copy(pos).add(offset.current), smooth, dt);
      controls.update();
    }
  });

  return null;
}

function Clock() {
  const { publishClock } = useExplorer();
  const acc = useRef(0);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    if (live.playing) {
      const next = live.simMs + step * live.speed * 86_400_000;
      if (next >= SIM_MAX) {
        live.simMs = SIM_MAX;
        live.playing = false;
      } else if (next <= SIM_MIN) {
        live.simMs = SIM_MIN;
        live.playing = false;
      } else {
        live.simMs = next;
      }
    }
    acc.current += step;
    if (acc.current > 0.25) {
      acc.current = 0;
      publishClock(live.simMs, live.formation);
    }
  });
  return null;
}

function SceneSwitch() {
  const { scene, beyond } = useExplorer();
  if (scene === "orrery") return <Orrery />;
  const sky = !(scene === "beyond" && beyond === "milkyway");
  if (scene === "beyond" && beyond === "universe") return <BeyondView />;
  return (
    <>
      <Backdrop sky={sky} />
      {scene === "anatomy" ? <AnatomyView /> : null}
      {scene === "formation" ? <FormationView /> : null}
      {scene === "beyond" ? <BeyondView /> : null}
    </>
  );
}

const down = { current: { x: 0, y: 0, moved: false } };

/** Canvas-level miss: fires only when a click hit nothing at all. */
function onCanvasMiss() {
  if (down.current.moved) return;
  if (live.scene !== "orrery") return;
  live.selected = null;
  liveMoon.id = null;
  live.mission = null;
  window.dispatchEvent(new CustomEvent("anorix-select-clear"));
}

function PointerBridge() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const onDown = (event: PointerEvent) => {
      down.current = { x: event.clientX, y: event.clientY, moved: false };
    };
    const onMove = (event: PointerEvent) => {
      const dx = event.clientX - down.current.x;
      const dy = event.clientY - down.current.y;
      if (dx * dx + dy * dy > 16) down.current.moved = true;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
    };
  }, [gl]);
  return null;
}

function maxDpr() {
  if (typeof window === "undefined") return 1;
  const mobile = window.matchMedia("(max-width: 800px)").matches;
  return Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
}

export function StageCanvas() {
  return (
    <Canvas
      onPointerMissed={onCanvasMiss}
      dpr={[1, maxDpr()]}
      camera={{ fov: 42, near: 0.05, far: 20000, position: [0, 34, 82] }}
      gl={{
        antialias: false,
        logarithmicDepthBuffer: true,
        localClippingEnabled: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, camera }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.NoToneMapping;
        gl.localClippingEnabled = true;
        gl.setClearColor("#000000", 1);
        camera.lookAt(0, 0, 0);
      }}
    >
      <Suspense fallback={null}>
        <MapGate>
          <SceneContents />
        </MapGate>
      </Suspense>
    </Canvas>
  );
}

function SceneContents() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <SceneSwitch />
      <PointerBridge />
      <Clock />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
      />
      <CameraRig />
      <Post />
    </>
  );
}

function Post() {
  const gl = useThree((state) => state.gl);
  const floatOk = useMemo(() => {
    const context = gl.getContext() as WebGL2RenderingContext;
    return Boolean(context.getExtension("EXT_color_buffer_float"));
  }, [gl]);
  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={false}
      depthBuffer
      frameBufferType={floatOk ? THREE.HalfFloatType : THREE.UnsignedByteType}
    >
      <Bloom
        intensity={0.75}
        luminanceThreshold={floatOk ? 0.9 : 0.68}
        luminanceSmoothing={0.2}
        mipmapBlur
        radius={0.5}
        levels={4}
        resolutionScale={0.5}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
