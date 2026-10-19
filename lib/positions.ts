import { eclipticLongitudeDeg, moonEcliptic, planetEcliptic, type Vec3 } from "./kepler";
import { geoMoonEcliptic, helioEcliptic } from "./ephem";
import { live } from "./live";
import { AU_SCENE, moonOrbitScene } from "./scale";

export interface SceneVec {
  x: number;
  y: number;
  z: number;
}

const AU_KM = 149_597_870.7;

function eclipticToScene(v: Vec3, scale: number): SceneVec {
  return { x: v.x * scale, y: v.z * scale, z: v.y * scale };
}

/**
 * meanOffsetDeg != 0 is only used to sample the orbit line (Keplerian, JPL
 * approximate elements). The body itself sits on the true astronomy-engine
 * position for the date.
 */
export function scenePosition(id: string, jd: number, meanOffsetDeg = 0): SceneVec {
  if (id === "sun") return { x: 0, y: 0, z: 0 };
  if (id === "moon") {
    const earthTrue = helioEcliptic("earth", jd)!;
    const base = eclipticToScene(earthTrue, AU_SCENE);
    const moon = meanOffsetDeg ? moonEcliptic(jd, meanOffsetDeg) : geoMoonEcliptic(jd);
    const len = Math.hypot(moon.x, moon.y, moon.z) || 1;
    const dist = live.trueScale ? (meanOffsetDeg ? 384_400 / AU_KM : len) * AU_SCENE : moonOrbitScene();
    return {
      x: base.x + (moon.x / len) * dist,
      y: base.y + (moon.z / len) * dist,
      z: base.z + (moon.y / len) * dist,
    };
  }
  if (meanOffsetDeg) return eclipticToScene(planetEcliptic(id, jd, meanOffsetDeg), AU_SCENE);
  const v = helioEcliptic(id, jd);
  return eclipticToScene(v ?? planetEcliptic(id, jd), AU_SCENE);
}

export function solarDistanceAu(id: string, jd: number): number | null {
  if (id === "sun") return null;
  if (id === "moon") {
    // Geocentric for the Moon (the panel shows distance from Earth).
    const m = geoMoonEcliptic(jd);
    return Math.hypot(m.x, m.y, m.z);
  }
  const v = helioEcliptic(id, jd);
  return v ? Math.hypot(v.x, v.y, v.z) : planetEcliptic(id, jd).r;
}

export function heliocentricLongitude(id: string, jd: number): number | null {
  if (id === "sun" || id === "moon") return null;
  const v = helioEcliptic(id, jd);
  return eclipticLongitudeDeg(v ?? planetEcliptic(id, jd));
}

export function sampleSceneOrbit(id: string, jd: number, count = 180): SceneVec[] {
  const pts: SceneVec[] = [];
  for (let i = 0; i <= count; i += 1) {
    const offset = (i / count) * 360;
    pts.push(scenePosition(id, jd, offset || 1e-9));
  }
  return pts;
}
