"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES, type BodyId } from "@/lib/bodies";
import { live } from "@/lib/live";
import { FORMATION_SUN, PlanetMaterial, useMaps } from "./materials";

const COUNT = 520;

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

export function FormationView() {
  const maps = useMaps();
  const id = (live.selected ?? "earth") as BodyId;
  const body = BODIES[id] ?? BODIES.earth;
  const points = useRef<THREE.Points>(null);
  const rock = useRef<THREE.Mesh>(null);
  const disk = useRef<THREE.Mesh>(null);
  const planet = useRef<THREE.Mesh>(null);
  const seeds = useMemo(() => {
    const rand = mulberry32(id.length * 97 + 3);
    return Array.from({ length: COUNT }, () => ({
      ang: rand() * Math.PI * 2,
      rad: 0.25 + Math.pow(rand(), 0.7) * 2.15,
      y: (rand() - 0.5) * 0.12,
      speed: 0.25 + rand() * 0.9,
    }));
  }, [id]);
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const layerMats = useMemo(
    () =>
      body.layers.map(
        (layer) =>
          new THREE.MeshBasicMaterial({
            color: layer.color,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
      ),
    [body],
  );

  const map =
    id === "sun"
      ? maps.sun
      : id === "venus"
        ? maps.venus
        : id === "earth"
          ? maps.earth
          : maps[id];

  useEffect(() => {
    if (live.reduce) return;
    live.formationPlaying = true;
    window.dispatchEvent(new Event("anorix-clock"));
  }, []);

  useEffect(() => () => layerMats.forEach((mat) => mat.dispose()), [layerMats]);

  useFrame((_, dt) => {
    if (live.formationPlaying && !live.reduce) {
      live.formation += dt / 18;
      if (live.formation > 1) live.formation = 0;
    }
    const t = live.formation * 4;
    const time = performance.now() / 1000;
    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i];
      const shrink = t < 1 ? 1 : t < 2 ? 1 - (t - 1) * 0.9 : 0.1;
      const ang = seed.ang + time * seed.speed * (t < 2 ? 1 : 0.2);
      const rad = seed.rad * shrink;
      positions[i * 3] = Math.cos(ang) * rad;
      positions[i * 3 + 1] = seed.y * shrink;
      positions[i * 3 + 2] = Math.sin(ang) * rad;
    }
    const attr = points.current?.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (attr) attr.needsUpdate = true;
    const dustOpacity = t < 2.1 ? 0.9 : Math.max(0, 0.9 - (t - 2.1) * 1.4);
    const dustMat = points.current?.material as THREE.PointsMaterial | undefined;
    if (dustMat) dustMat.opacity = dustOpacity;
    if (disk.current) {
      const mat = disk.current.material as THREE.MeshBasicMaterial;
      mat.opacity = t < 1.4 ? 0.35 : Math.max(0, 0.35 - (t - 1.4) * 0.4);
    }
    if (rock.current) {
      const grow = THREE.MathUtils.smoothstep(t, 0.7, 2);
      const fade = 1 - THREE.MathUtils.smoothstep(t, 2.05, 2.7);
      rock.current.scale.setScalar(0.15 + grow * 0.42);
      rock.current.visible = fade > 0.02 && grow > 0.02;
      const mat = rock.current.material as THREE.MeshBasicMaterial;
      mat.opacity = fade * grow;
    }
    const layerIn = THREE.MathUtils.smoothstep(t, 1.9, 2.6);
    const layerOut = 1 - THREE.MathUtils.smoothstep(t, 3.05, 3.55);
    const layerOpacity = layerIn * layerOut;
    layerMats.forEach((mat) => {
      mat.opacity = layerOpacity;
    });
    if (planet.current) {
      const show = THREE.MathUtils.smoothstep(t, 3.05, 3.7);
      planet.current.visible = show > 0.02;
      planet.current.scale.setScalar(0.72 + show * 0.28);
    }
  });

  return (
    <group>
      <mesh ref={disk} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 2.5, 96]} />
        <meshBasicMaterial color="#6e675e" side={THREE.DoubleSide} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d9d0c4" size={0.035} transparent opacity={0.9} depthWrite={false} sizeAttenuation />
      </points>
      <mesh ref={rock}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#8d735c" transparent opacity={0} />
      </mesh>
      {body.layers.map((layer, index) => (
        <group key={layer.name} scale={layer.radius * 0.95}>
          <mesh material={layerMats[index]}>
            <sphereGeometry args={[1, 40, 28, Math.PI, Math.PI]} />
          </mesh>
          <mesh material={layerMats[index]} position={[0, 0, (body.layers.length - index) * 0.02]}>
            <circleGeometry args={[0.995, 48]} />
          </mesh>
        </group>
      ))}
      <mesh ref={planet} visible={false}>
        <sphereGeometry args={[0.95, 56, 40]} />
        {id === "sun" ? (
          <meshBasicMaterial map={map} toneMapped={false} />
        ) : (
          <PlanetMaterial
            map={map}
            night={id === "earth" ? maps.earthNight : null}
            cloud={id === "earth" ? maps.earthClouds : id === "venus" ? maps.venusClouds : null}
            sun={FORMATION_SUN}
            earth={id === "earth"}
          />
        )}
      </mesh>
    </group>
  );
}
