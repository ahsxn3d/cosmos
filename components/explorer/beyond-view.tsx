"use client";

import { UniverseView } from "./universe-view";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { live } from "@/lib/live";
import { diskFrag, diskVert, touchTime } from "./materials";

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

function Galaxy() {
  const geometry = useMemo(() => {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const rand = mulberry32(26);
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const bulge = i < 1400;
      if (bulge) {
        const r = Math.pow(rand(), 0.45) * 14;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi) * 0.45;
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        color.set("#e4d7c4");
      } else {
        const arm = i % 4;
        const along = rand();
        const angle = along * Math.PI * 3.4 + (arm * Math.PI) / 2;
        const radius = 8 + along * 62;
        const scatter = (rand() - 0.5) * (3.2 + along * 5);
        positions[i * 3] = Math.cos(angle) * radius + Math.cos(angle + 1.2) * scatter;
        positions[i * 3 + 1] = (rand() - 0.5) * (0.8 + (1 - along) * 2.4);
        positions[i * 3 + 2] = Math.sin(angle) * radius + Math.sin(angle + 1.2) * scatter;
        color.set(rand() > 0.92 ? "#f2efe8" : "#b7b7b7");
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial size={0.55} vertexColors sizeAttenuation transparent opacity={0.92} depthWrite={false} />
      </points>
      <mesh position={[46, 0.4, 8]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <Html position={[46, 3.2, 8]} center wrapperClass="tag-wrap" pointerEvents="none" zIndexRange={[12, 0]}>
        <div className="body-tag" style={{ opacity: 1 }}>
          Sun
        </div>
      </Html>
    </group>
  );
}

function Proxima() {
  const planet = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.35;
    if (planet.current) {
      planet.current.position.set(Math.cos(t) * 2.15, 0.05, Math.sin(t) * 2.15);
    }
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.62, 48, 32]} />
        <meshBasicMaterial color="#e7a090" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.05, 2.25, 80]} />
        <meshBasicMaterial color="#3a3a3a" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={planet}>
        <sphereGeometry args={[0.11, 24, 16]} />
        <meshBasicMaterial color="#c5ccd4" />
      </mesh>
      <Html position={[0, 1.15, 0]} center wrapperClass="tag-wrap" pointerEvents="none" zIndexRange={[12, 0]}>
        <div className="body-tag" style={{ opacity: 1 }}>
          Proxima Centauri
        </div>
      </Html>
    </group>
  );
}

function BlackHole() {
  const spin = useRef<THREE.Group>(null);
  const disk = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: diskVert,
        fragmentShader: diskFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    if (spin.current && !live.reduce) spin.current.rotation.y += dt * 0.18;
    touchTime(disk.current?.material, live.reduce ? 0 : performance.now() / 1000);
  });
  return (
    <group rotation={[0.55, 0.2, 0.1]}>
      <group ref={spin}>
        <mesh ref={disk} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 1.62, 180]} />
          <primitive object={material} attach="material" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.28, 48, 32]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.008, 12, 80]} />
          <meshBasicMaterial color="#f3ead8" toneMapped={false} />
        </mesh>
      </group>
      <Html position={[0, 1.15, 0]} center wrapperClass="tag-wrap" pointerEvents="none" zIndexRange={[12, 0]}>
        <div className="body-tag" style={{ opacity: 1 }}>
          Sagittarius A*
        </div>
      </Html>
    </group>
  );
}

export function BeyondView() {
  if (live.beyond === "universe") return <UniverseView />;
  if (live.beyond === "proxima") return <Proxima />;
  if (live.beyond === "sagittarius") return <BlackHole />;
  return <Galaxy />;
}
