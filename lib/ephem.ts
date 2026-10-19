import * as Astronomy from "astronomy-engine";

/**
 * True positions from astronomy-engine (Don Cross, MIT), which implements
 * VSOP87 for the planets, a numerical model for Pluto and ELP/MPP02-based
 * lunar theory. Output is J2000 mean ecliptic, AU.
 * https://github.com/cosinekitty/astronomy
 */
const ROT = Astronomy.Rotation_EQJ_ECL();
const BODY: Record<string, Astronomy.Body> = {
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  earth: Astronomy.Body.Earth,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto,
};

export interface EclVec {
  x: number;
  y: number;
  z: number;
}

const cache = new Map<string, EclVec>();
let cacheJd = NaN;

function timeOf(jd: number) {
  return Astronomy.MakeTime(jd - 2451545.0);
}

/** Heliocentric ecliptic J2000 vector in AU. */
export function helioEcliptic(id: string, jd: number): EclVec | null {
  if (!(id in BODY)) return null;
  if (jd !== cacheJd) {
    cache.clear();
    cacheJd = jd;
  }
  const hit = cache.get(id);
  if (hit) return hit;
  const v = Astronomy.RotateVector(ROT, Astronomy.HelioVector(BODY[id], timeOf(jd)));
  const out = { x: v.x, y: v.y, z: v.z };
  cache.set(id, out);
  return out;
}

/** Geocentric ecliptic J2000 vector of the Moon in AU. */
export function geoMoonEcliptic(jd: number): EclVec {
  const key = "moon";
  if (jd === cacheJd) {
    const hit = cache.get(key);
    if (hit) return hit;
  } else {
    cache.clear();
    cacheJd = jd;
  }
  const v = Astronomy.RotateVector(ROT, Astronomy.GeoMoon(timeOf(jd)));
  const out = { x: v.x, y: v.y, z: v.z };
  cache.set(key, out);
  return out;
}
