"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { unixToJd } from "@/lib/julian";
import { solarDistanceAu } from "@/lib/positions";
import { live, livePositions, missionPositions } from "@/lib/live";
import { loadTracks, MISSIONS, sampleTrack, type MissionInfo, type Track } from "@/lib/missions";
import { AU_SCENE, displayRadius, moonOrbitScene, visualRadius } from "@/lib/scale";

const JUPITER_KM = 71_492;
const SUN_R = 4.6;

/** AU (ecliptic) → scene. Parker's distance is stretched so it clears the enlarged Sun. */
function helioToScene(v: [number, number, number], parker: boolean, out: THREE.Vector3) {
  out.set(v[0], v[2], v[1]);
  const r = out.length();
  if (parker && !live.trueScale) out.setLength(SUN_R * 1.12 + r * AU_SCENE * 0.8);
  else out.multiplyScalar(AU_SCENE);
  return out;
}

function placeMission(m: MissionInfo, tracks: Record<string, Track>, jd: number, out: THREE.Vector3): boolean {
  if (m.id === "juno") {
    const local = sampleTrack(tracks.juno, jd);
    if (local) {
      out.set(local[0], local[2], local[1]);
      const r = out.length() / JUPITER_KM;
      const R = live.trueScale ? displayRadius("jupiter") : visualRadius("jupiter");
      out.setLength(live.trueScale ? r * R : R * (1.15 + 0.35 * Math.log(Math.max(1.05, r))));
      out.add(livePositions.jupiter);
      return true;
    }
    const cruise = sampleTrack(tracks.juno_cruise, jd);
    if (!cruise) return false;
    helioToScene(cruise, false, out);
    return true;
  }
  if (m.id === "jwst") {
    const g = sampleTrack(tracks.jwst, jd);
    if (!g) return false;
    out.set(g[0], g[2], g[1]);
    const km = out.length();
    out.setLength(live.trueScale ? (km / 149_597_870.7) * AU_SCENE : moonOrbitScene() * Math.sqrt(km / 384_400));
    out.add(livePositions.earth);
    return true;
  }
  const h = sampleTrack(tracks[m.id], jd);
  if (!h) return false;
  helioToScene(h, m.id === "parker", out);
  return true;
}

function Trail({ m, tracks }: { m: MissionInfo; tracks: Record<string, Track> }) {
  const geom = useMemo(() => new THREE.BufferGeometry(), []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#3b82f6", transparent: true, opacity: 0.35 }), []);
  const line = useMemo(() => {
    const l = new THREE.Line(geom, mat);
    l.frustumCulled = false;
    l.raycast = () => undefined;
    return l;
  }, [geom, mat]);
  const src = m.id === "juno" ? tracks.juno_cruise : m.id === "jwst" ? null : tracks[m.id];
  const scene = useMemo(() => {
    if (!src) return null;
    const v = new THREE.Vector3();
    const arr = new Float32Array(src.pts.length * 3);
    src.pts.forEach((p, i) => {
      helioToScene([p[1], p[2], p[3]], m.id === "parker", v);
      arr.set([v.x, v.y, v.z], i * 3);
    });
    return arr;
  }, [src, m.id]);
  useEffect(() => {
    if (scene) geom.setAttribute("position", new THREE.BufferAttribute(scene, 3));
    return () => {
      geom.dispose();
      mat.dispose();
    };
  }, [geom, mat, scene]);
  useFrame(() => {
    if (!src || !scene) return;
    const jd = unixToJd(live.simMs);
    // Draw only the path flown so far (Parker: last ~3 orbits).
    let n = 0;
    while (n < src.pts.length && src.pts[n][0] <= jd) n += 1;
    const start = m.id === "parker" ? Math.max(0, n - 270) : 0;
    geom.setDrawRange(start, Math.max(0, n - start));
    line.visible = live.showOrbits && (!live.trueScale || m.id !== "parker");
    mat.opacity = live.mission === m.id ? 0.75 : 0.12;
  });
  return <primitive object={line} />;
}

function Craft({ m, tracks }: { m: MissionInfo; tracks: Record<string, Track> }) {
  const group = useRef<THREE.Group>(null);
  const tag = useRef<HTMLDivElement>(null);
  const world = useMemo(() => {
    const v = new THREE.Vector3();
    missionPositions[m.id] = v;
    return v;
  }, [m.id]);
  useFrame(({ camera }) => {
    const ok = placeMission(m, tracks, unixToJd(live.simMs), world);
    const g = group.current;
    if (!g) return;
    g.visible = ok && live.scene === "orrery";
    if (!ok) return;
    g.position.copy(world);
    const d = camera.position.distanceTo(world);
    g.scale.setScalar(Math.max(0.0005, d * 0.006));
    if (tag.current) tag.current.style.opacity = live.mission === m.id || d < 160 ? "1" : "0";
  });
  return (
    <group ref={group}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("anorix-mission", { detail: m.id }));
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#9cc2ff" toneMapped={false} />
      </mesh>
      <Html position={[0, 2.4, 0]} center zIndexRange={[11, 0]} wrapperClass="tag-wrap" pointerEvents="none">
        <div ref={tag} className="body-tag mission-tag" style={{ opacity: 0 }}>
          {m.name}
        </div>
      </Html>
    </group>
  );
}

export function Missions() {
  const [tracks, setTracks] = useState<Record<string, Track> | null>(null);
  useEffect(() => {
    let alive = true;
    loadTracks().then((t) => alive && setTracks(t));
    return () => {
      alive = false;
    };
  }, []);
  if (!tracks) return null;
  return (
    <group>
      {MISSIONS.map((m) => (
        <group key={m.id}>
          <Trail m={m} tracks={tracks} />
          <Craft m={m} tracks={tracks} />
        </group>
      ))}
    </group>
  );
}

/** Distance from the Sun (AU) for the panel, from the same tables. */
export async function missionSunDistance(id: string, jd: number): Promise<number | null> {
  const tracks = await loadTracks();
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return null;
  if (m.id === "juno") {
    const c = sampleTrack(tracks.juno_cruise, jd);
    if (c) return Math.hypot(...c);
    // In orbit: Juno is within ~0.05 AU of Jupiter.
    return sampleTrack(tracks.juno, jd) ? solarDistanceAu("jupiter", jd) : null;
  }
  if (m.id === "jwst") return null;
  const h = sampleTrack(tracks[m.id], jd);
  return h ? Math.hypot(...h) : null;
}
