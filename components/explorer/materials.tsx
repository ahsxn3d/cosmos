"use client";

import { useTexture } from "@react-three/drei";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";

export const MAP_PATHS = {
  sun: "/textures/sun.jpg",
  mercury: "/textures/mercury.jpg",
  venus: "/textures/venus_surface.jpg",
  venusClouds: "/textures/venus_atmosphere.jpg",
  earth: "/textures/earth_day.jpg",
  earthNight: "/textures/earth_night.jpg",
  earthClouds: "/textures/earth_clouds.jpg",
  moon: "/textures/moon.jpg",
  mars: "/textures/mars.jpg",
  jupiter: "/textures/jupiter.jpg",
  saturn: "/textures/saturn.jpg",
  saturnRing: "/textures/hi/saturn_ring.png",
  uranus: "/textures/uranus.jpg",
  neptune: "/textures/neptune.jpg",
  pluto: "/textures/pluto.jpg",
  milkyway: "/textures/milkyway.jpg",
} as const;

export const HI_COLOR: Record<string, string> = {
  sun: "/textures/hi/sun.webp",
  mercury: "/textures/hi/mercury.webp",
  venus: "/textures/hi/venus_surface.webp",
  earth: "/textures/hi/earth_day.webp",
  moon: "/textures/hi/moon.webp",
  mars: "/textures/hi/mars.webp",
  jupiter: "/textures/hi/jupiter.webp",
  saturn: "/textures/hi/saturn.webp",
  pluto: "/textures/hi/pluto.webp",
};

export const HI_EXTRA = {
  earthNight: "/textures/hi/earth_night.webp",
  earthClouds: "/textures/hi/earth_clouds.webp",
  venusClouds: "/textures/hi/venus_atmosphere.webp",
  milkyway: "/textures/hi/milkyway.webp",
} as const;

/** Normal maps computed from real elevation: MGS MOLA MEGDR (Mars) and LRO LOLA (Moon, NASA SVS CGI Moon Kit). */
export const HI_NORMAL: Record<string, string> = {
  mars: "/textures/hi/mars_normal.webp",
  moon: "/textures/hi/moon_normal.webp",
};

export type Maps = Record<keyof typeof MAP_PATHS, THREE.Texture>;

const MapContext = createContext<Maps | null>(null);
const hiCache = new Map<string, THREE.Texture>();
const hiOrder: string[] = [];

function configureColor(tex: THREE.Texture, anisotropy = 16) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
}

export function MapGate({ children }: { children: ReactNode }) {
  const maps = useTexture(MAP_PATHS) as Maps;
  useLayoutEffect(() => {
    for (const tex of Object.values(maps)) configureColor(tex, 8);
  }, [maps]);
  return <MapContext.Provider value={maps}>{children}</MapContext.Provider>;
}

export function useMaps(): Maps {
  const maps = useContext(MapContext);
  if (!maps) throw new Error("Textures are still loading");
  return maps;
}

function rememberHi(url: string, tex: THREE.Texture, pin: boolean) {
  if (hiCache.has(url)) return;
  configureColor(tex, 8);
  hiCache.set(url, tex);
  if (pin) return;
  hiOrder.push(url);
  while (hiOrder.length > 4) {
    const old = hiOrder.shift();
    if (!old || old === url) continue;
    const stale = hiCache.get(old);
    if (stale) {
      stale.dispose();
      hiCache.delete(old);
    }
  }
}

/** Loads a color map after first paint. Pass null to skip. Cached and capped. */
export function useHiTexture(url: string | null, pin = false) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url || hiCache.has(url)) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      rememberHi(url, tex, pin);
      if (alive) setTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [url, pin]);
  void tick;
  return url ? (hiCache.get(url) ?? null) : null;
}

const dataCache = new Map<string, THREE.Texture>();

export function useDataTexture(url: string | null) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url || dataCache.has(url)) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = 8;
      dataCache.set(url, tex);
      if (alive) setTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  void tick;
  return url ? (dataCache.get(url) ?? null) : null;
}

const vert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vTangentW;
  varying vec3 vBitangentW;
  void main() {
    vUv = uv;
    vec3 n = normalize(normal);
    vec3 t = normalize(cross(vec3(0.0, 1.0, 0.0), n));
    if (dot(t, t) < 1e-4) t = vec3(1.0, 0.0, 0.0);
    vec3 b = cross(n, t);
    mat3 m = mat3(modelMatrix);
    vNormalW = normalize(m * n);
    vTangentW = normalize(m * t);
    vBitangentW = normalize(m * b);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
    #include <logdepthbuf_vertex>
  }
`;

const planetFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform sampler2D uNight;
  uniform sampler2D uCloud;
  uniform sampler2D uNormal;
  uniform sampler2D uSpec;
  uniform float uHasNight;
  uniform float uHasCloud;
  uniform float uHasNormal;
  uniform float uHasSpec;
  uniform vec3 uSun;
  uniform vec3 uCenter;
  uniform vec3 uAxis;
  uniform vec3 uOccCenter;
  uniform float uOccRadius;
  uniform float uRingInner;
  uniform float uRingOuter;
  uniform sampler2D uRing;
  uniform float uHasRing;
  uniform float uBump;
  uniform float uSpecPower;
  uniform float uSpecGain;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vTangentW;
  varying vec3 vBitangentW;

  float sphereShadow(vec3 ro, vec3 rd, vec3 c, float r) {
    if (r <= 0.001) return 1.0;
    vec3 oc = c - ro;
    float t = dot(oc, rd);
    if (t <= 0.0) return 1.0;
    float d = length(oc - rd * t);
    return smoothstep(r * 0.98, r * 1.08, d);
  }

  float ringShadow(vec3 ro, vec3 rd) {
    if (uRingOuter <= 0.0) return 1.0;
    float denom = dot(rd, uAxis);
    if (abs(denom) < 1e-4) return 1.0;
    float t = dot(uCenter - ro, uAxis) / denom;
    if (t < 0.03) return 1.0;
    vec3 hit = ro + rd * t;
    float radial = length(hit - uCenter);
    if (radial < uRingInner || radial > uRingOuter) return 1.0;
    float u = (radial - uRingInner) / max(1e-5, uRingOuter - uRingInner);
    // Optical depth from the same radial ring map the rings are drawn with.
    float density = uHasRing > 0.5 ? texture2D(uRing, vec2(u, 0.5)).a : 0.7;
    return 1.0 - density * 0.85;
  }

  void main() {
    vec3 N = normalize(vNormalW);
    if (uHasNormal > 0.5) {
      vec3 tn = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
      tn.xy *= 1.25;
      N = normalize(vTangentW * tn.x + vBitangentW * tn.y + vNormalW * tn.z);
    }
    vec3 day = texture2D(uMap, vUv).rgb;
    if (uBump > 0.0 && uHasNormal < 0.5) {
      float h = dot(day, vec3(0.299, 0.587, 0.114));
      N = normalize(N + vec3(-dFdx(h), -dFdy(h), 0.0) * uBump);
    }
    vec3 L = normalize(uSun - vPosW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, L);
    float lit = smoothstep(-0.06, 0.22, ndl);
    float shade = 0.035 + 0.965 * lit;
    shade *= sphereShadow(vPosW, L, uOccCenter, uOccRadius);
    shade *= ringShadow(vPosW, L);
    if (uHasCloud > 0.5) {
      float cloud = texture2D(uCloud, vUv).r;
      shade *= mix(1.0, 0.62, smoothstep(0.12, 0.7, cloud));
    }
    vec3 col = day * shade;
    if (uHasNight > 0.5) {
      vec3 night = texture2D(uNight, vUv).rgb;
      float dark = 1.0 - smoothstep(-0.02, 0.2, ndl);
      col += night * dark * 1.35;
    }
    float specMask = uHasSpec > 0.5 ? texture2D(uSpec, vUv).r : 1.0;
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), uSpecPower) * specMask * uSpecGain * lit;
    col += spec * vec3(0.9, 0.94, 1.0);
    gl_FragColor = vec4(col, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

const cloudFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform vec3 uSun;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uSun - vPosW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, L);
    float lit = smoothstep(-0.15, 0.45, ndl);
    vec3 tex = texture2D(uMap, vUv).rgb;
    float lum = max(tex.r, max(tex.g, tex.b));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float alpha = smoothstep(0.05, 0.55, lum) * uOpacity * (0.35 + 0.65 * lit);
    alpha *= 0.82 + fres * 0.35;
    if (alpha < 0.02) discard;
    vec3 col = mix(vec3(0.62, 0.66, 0.72), vec3(1.0), lit);
    col *= tex;
    gl_FragColor = vec4(col, alpha);
    #include <logdepthbuf_fragment>
  }
`;

const ringVert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying float vRad;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vRad = length(position.xy);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
    #include <logdepthbuf_vertex>
  }
`;

const ringFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform vec3 uSun;
  uniform vec3 uCenter;
  uniform float uInner;
  uniform float uOuter;
  uniform float uPlanetR;
  varying float vRad;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  float sphereShadow(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 oc = c - ro;
    float t = dot(oc, rd);
    if (t <= 0.0) return 1.0;
    float d = length(oc - rd * t);
    return smoothstep(r * 0.98, r * 1.05, d);
  }
  void main() {
    float u = clamp((vRad - uInner) / max(0.0001, uOuter - uInner), 0.0, 1.0);
    vec4 tex = texture2D(uMap, vec2(u, 0.5));
    if (tex.a < 0.04) discard;
    vec3 L = normalize(uSun - vPosW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 Nr = normalize(vNormalW);
    float ndl = abs(dot(Nr, L));
    // Lit face vs unlit face: light diffuses through thin rings.
    float sameSide = step(0.0, dot(Nr, L) * dot(Nr, V));
    float through = (1.0 - tex.a) * 0.9 + 0.1;
    float shade = (0.12 + 0.88 * ndl) * mix(through, 1.0, sameSide);
    float fwd = pow(max(dot(-V, L), 0.0), 6.0) * (1.0 - tex.a);
    shade *= sphereShadow(vPosW, L, uCenter, uPlanetR);
    vec3 col = tex.rgb * shade + tex.rgb * fwd * 0.6 * sphereShadow(vPosW, L, uCenter, uPlanetR);
    gl_FragColor = vec4(col, tex.a);
    #include <logdepthbuf_fragment>
  }
`;

const atmosFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 uSun;
  uniform vec3 uColor;
  uniform vec3 uSunset;
  uniform float uStrength;
  uniform float uPower;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 L = normalize(uSun - vPosW);
    float ndv = max(dot(N, V), 0.0);
    float rim = pow(1.0 - ndv, uPower);
    float sl = dot(N, L);
    float day = smoothstep(-0.25, 0.35, sl);
    // Terminator band: long light paths redden (or blue, on Mars).
    float term = exp(-pow(sl / 0.22, 2.0));
    // Mie-like forward scattering when the planet is backlit.
    float fwd = pow(max(dot(-V, L), 0.0), 8.0);
    float glow = rim * (0.06 + 0.94 * day) + rim * term * 0.6 + rim * fwd * 1.4;
    vec3 col = mix(uColor, uSunset, clamp(term * 0.85 + fwd * 0.5, 0.0, 1.0));
    col *= 0.75 + 0.45 * day;
    float alpha = glow * uStrength;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <logdepthbuf_fragment>
  }
`;

const sunVert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vObj = normalize(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
    #include <logdepthbuf_vertex>
  }
`;

const sunFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D uMap;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * n3(p); p *= 2.02; a *= 0.5; } return v; }
  // granulation: animated cellular pattern (bright cells, dark intergranular lanes)
  float cells(vec3 p, float t) {
    vec3 i = floor(p); vec3 f = fract(p); float d1 = 1.0; float d2 = 1.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = vec3(h3(i + g), h3(i + g + 3.1), h3(i + g + 7.7));
      o = 0.5 + 0.45 * sin(t * 0.35 + 6.2831 * o);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
    return d2 - d1;
  }
  void main() {
    vec3 p = vObj;
    float t = uTime;
    vec3 warp = vec3(fbm(p * 3.0 + t * 0.02), fbm(p * 3.0 + 5.2 - t * 0.015), fbm(p * 3.0 + 9.1));
    float g = cells(p * 38.0 + warp * 2.0, t);
    float gran = smoothstep(0.0, 0.28, g);
    float meso = fbm(p * 7.0 + warp + t * 0.01);
    // sunspots: active latitude bands, umbra + penumbra
    float lat = abs(p.y);
    float band = smoothstep(0.05, 0.18, lat) * (1.0 - smoothstep(0.42, 0.55, lat));
    float spotN = fbm(p * 5.5 + 17.0);
    float spot = band * smoothstep(0.66, 0.72, spotN);
    float umbra = band * smoothstep(0.71, 0.75, spotN);
    // faculae near spots
    float fac = band * smoothstep(0.58, 0.66, spotN) * (1.0 - spot);
    vec3 photo = texture2D(uMap, vUv).rgb;
    vec3 lane = vec3(0.85, 0.36, 0.06);
    vec3 cell = vec3(1.0, 0.86, 0.58);
    vec3 col = mix(lane, cell, gran * 0.75 + meso * 0.35);
    col *= 0.85 + 0.3 * dot(photo, vec3(0.33));
    col = mix(col, col * 0.45, spot);
    col = mix(col, vec3(0.18, 0.05, 0.01), umbra);
    col += fac * vec3(0.25, 0.18, 0.08);
    // limb darkening, quadratic law (visible): I = 1 - 0.47(1-mu) - 0.23(1-mu)^2, and reddening at the limb
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float mu = clamp(dot(N, V), 0.0, 1.0);
    float k = 1.0 - mu;
    float I = 1.0 - 0.47 * k - 0.23 * k * k;
    col *= I;
    col = mix(col, col * vec3(1.0, 0.62, 0.35), k * k);
    gl_FragColor = vec4(col * 3.2, 1.0);
    #include <logdepthbuf_fragment>
  }
`;

const coronaFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uTime;
  uniform float uGain;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - abs(dot(N, V)), 2.15);
    vec3 d = normalize(vPosW);
    float ang = atan(d.y, length(d.xz)) * 9.0 + atan(d.z, d.x) * 5.0;
    float streak = 0.75 + 0.25 * sin(ang + uTime * 0.08) * sin(ang * 2.3 - uTime * 0.05);
    float pulse = 0.92 + 0.08 * sin(uTime * 0.45 + vPosW.y * 0.15);
    vec3 col = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.85, 0.65), rim) * rim * pulse * streak * uGain;
    float alpha = rim * 0.55 * streak;
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(col, alpha);
    #include <logdepthbuf_fragment>
  }
`;

export const diskVert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

export const diskFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying vec2 vLocal;
  uniform float uTime;
  void main() {
    float r = length(vLocal);
    float theta = atan(vLocal.y, vLocal.x);
    float inner = 0.36;
    float outer = 1.62;
    float disk = smoothstep(outer, outer - 0.16, r) * smoothstep(inner, inner + 0.08, r);
    float bands = 0.7 + 0.3 * sin(theta * 8.0 - r * 24.0 + uTime * 1.4);
    float doppler = 0.38 + 0.9 * pow(max(sin(theta + 0.55), 0.0), 1.4);
    vec3 hot = vec3(1.15, 0.78, 0.42);
    vec3 warm = vec3(0.55, 0.16, 0.04);
    float heat = smoothstep(outer, inner + 0.04, r);
    vec3 col = mix(warm, hot, heat) * bands * doppler * (1.1 + heat * 1.6);
    float alpha = disk * (0.22 + 0.78 * heat);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
    #include <logdepthbuf_fragment>
  }
`;

export const starVert = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = mix(1.15, 2.8, aSeed);
    gl_PointSize = clamp(size * (280.0 / max(1.0, -mv.z)), 1.0, 3.4);
    vColor = aColor;
    vTw = 0.82 + 0.18 * sin(uTime * (0.55 + aSeed * 1.6) + aSeed * 40.0);
    #include <logdepthbuf_vertex>
  }
`;

export const starFrag = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying vec3 vColor;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    float alpha = smoothstep(1.0, 0.2, d) * vTw;
    gl_FragColor = vec4(vColor * (0.85 + vTw * 0.4), alpha);
    #include <logdepthbuf_fragment>
  }
`;

const ORIGIN = new THREE.Vector3(0, 0, 0);
export const FORMATION_SUN = new THREE.Vector3(7, 3, 5);

function shader(
  vertex: string,
  fragment: string,
  uniforms: Record<string, THREE.IUniform>,
  opts?: { transparent?: boolean; side?: THREE.Side; blending?: THREE.Blending; depthWrite?: boolean },
) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: opts?.transparent ?? false,
    depthWrite: opts?.depthWrite ?? !opts?.transparent,
    side: opts?.side ?? THREE.FrontSide,
    blending: opts?.blending ?? THREE.NormalBlending,
    toneMapped: false,
  });
}

export function PlanetMaterial({
  map,
  night,
  cloud,
  sun = ORIGIN,
  axis,
  ringInner = 0,
  ringOuter = 0,
  ringMap = null,
  bump = 0,
  specPower = 24,
  specGain = 0.08,
  earth = false,
  normalUrl = null,
}: {
  map: THREE.Texture;
  night?: THREE.Texture | null;
  cloud?: THREE.Texture | null;
  sun?: THREE.Vector3;
  axis?: THREE.Vector3;
  ringInner?: number;
  ringOuter?: number;
  ringMap?: THREE.Texture | null;
  bump?: number;
  specPower?: number;
  specGain?: number;
  earth?: boolean;
  normalUrl?: string | null;
}) {
  const normal = useDataTexture(earth ? "/textures/earth_normal.png" : (normalUrl ?? null));
  const spec = useDataTexture(earth ? "/textures/earth_spec.png" : null);
  const material = useMemo(
    () =>
      shader(vert, planetFrag, {
        uMap: { value: map },
        uNight: { value: night ?? map },
        uCloud: { value: cloud ?? map },
        uNormal: { value: normal ?? map },
        uSpec: { value: spec ?? map },
        uHasNight: { value: night ? 1 : 0 },
        uHasCloud: { value: cloud ? 1 : 0 },
        uHasNormal: { value: normal ? 1 : 0 },
        uHasSpec: { value: spec ? 1 : 0 },
        uSun: { value: sun },
        uCenter: { value: new THREE.Vector3() },
        uAxis: { value: axis ?? new THREE.Vector3(0, 1, 0) },
        uOccCenter: { value: new THREE.Vector3() },
        uOccRadius: { value: 0 },
        uRingInner: { value: ringInner },
        uRingOuter: { value: ringOuter },
        uRing: { value: ringMap ?? map },
        uHasRing: { value: ringMap ? 1 : 0 },
        uBump: { value: bump },
        uSpecPower: { value: specPower },
        uSpecGain: { value: specGain },
      }),
    [map, night, cloud, normal, spec, sun, axis, ringInner, ringOuter, ringMap, bump, specPower, specGain],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

export function CloudMaterial({
  map,
  opacity,
  sun = ORIGIN,
}: {
  map: THREE.Texture;
  opacity: number;
  sun?: THREE.Vector3;
}) {
  const material = useMemo(
    () =>
      shader(
        vert,
        cloudFrag,
        { uMap: { value: map }, uSun: { value: sun }, uOpacity: { value: opacity } },
        { transparent: true, depthWrite: false },
      ),
    [map, opacity, sun],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

export function RingMaterial({
  map,
  inner,
  outer,
  planetRadius,
  sun = ORIGIN,
}: {
  map: THREE.Texture;
  inner: number;
  outer: number;
  planetRadius: number;
  sun?: THREE.Vector3;
}) {
  const material = useMemo(
    () =>
      shader(
        ringVert,
        ringFrag,
        {
          uMap: { value: map },
          uSun: { value: sun },
          uCenter: { value: new THREE.Vector3() },
          uInner: { value: inner },
          uOuter: { value: outer },
          uPlanetR: { value: planetRadius },
        },
        { transparent: true, depthWrite: false, side: THREE.DoubleSide },
      ),
    [map, inner, outer, planetRadius, sun],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

export function AtmosphereMaterial({
  color,
  sunset,
  strength,
  power,
  sun = ORIGIN,
}: {
  color: string;
  sunset?: string;
  strength: number;
  power: number;
  sun?: THREE.Vector3;
}) {
  const material = useMemo(
    () =>
      shader(
        vert,
        atmosFrag,
        {
          uSun: { value: sun },
          uColor: { value: new THREE.Color(color) },
          uSunset: { value: new THREE.Color(sunset ?? color) },
          uStrength: { value: strength },
          uPower: { value: power },
        },
        { transparent: true, depthWrite: false, side: THREE.FrontSide },
      ),
    [color, sunset, strength, power, sun],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

export function SunMaterial({ map }: { map: THREE.Texture }) {
  const material = useMemo(
    () => shader(sunVert, sunFrag, { uMap: { value: map }, uTime: { value: 0 } }),
    [map],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

export function CoronaMaterial({ gain }: { gain: number }) {
  const material = useMemo(
    () =>
      shader(vert, coronaFrag, { uTime: { value: 0 }, uGain: { value: gain } }, {
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    [gain],
  );
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

export function touchTime(material: THREE.Material | THREE.Material[] | undefined, time: number) {
  const list = Array.isArray(material) ? material : material ? [material] : [];
  for (const entry of list) {
    const mat = entry as THREE.ShaderMaterial;
    if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = time;
  }
}

export function touchCenter(material: THREE.Material | THREE.Material[] | undefined, center: THREE.Vector3) {
  const list = Array.isArray(material) ? material : material ? [material] : [];
  for (const entry of list) {
    const mat = entry as THREE.ShaderMaterial;
    if (mat?.uniforms?.uCenter) mat.uniforms.uCenter.value.copy(center);
  }
}

export function touchOcc(
  material: THREE.Material | THREE.Material[] | undefined,
  center: THREE.Vector3,
  radius: number,
) {
  const mat = (Array.isArray(material) ? material[0] : material) as THREE.ShaderMaterial | undefined;
  if (!mat?.uniforms?.uOccCenter) return;
  mat.uniforms.uOccCenter.value.copy(center);
  mat.uniforms.uOccRadius.value = radius;
}
