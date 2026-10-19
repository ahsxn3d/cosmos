import { J2000 } from "./julian";

/**
 * Simplified Keplerian elements, J2000 ecliptic.
 * Planets except Pluto: E. M. Standish / JPL, valid 1800–2050.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Earth is the Earth–Moon barycenter (about 4,670 km from Earth's center).
 * Pluto is not in that table; mean elements at J2000 are listed below.
 */
export interface KeplerElements {
  a0: number;
  ad: number;
  e0: number;
  ed: number;
  I0: number;
  Id: number;
  L0: number;
  Ld: number;
  /** Longitude of perihelion, degrees. */
  w0: number;
  wd: number;
  O0: number;
  Od: number;
}

export const PLANET_ELEMENTS: Record<string, KeplerElements> = {
  mercury: {
    a0: 0.38709927, ad: 0.00000037,
    e0: 0.20563593, ed: 0.00001906,
    I0: 7.00497902, Id: -0.00594749,
    L0: 252.2503235, Ld: 149472.67411175,
    w0: 77.45779628, wd: 0.16047689,
    O0: 48.33076593, Od: -0.12534081,
  },
  venus: {
    a0: 0.72333566, ad: 0.0000039,
    e0: 0.00677672, ed: -0.00004107,
    I0: 3.39467605, Id: -0.0007889,
    L0: 181.9790995, Ld: 58517.81538729,
    w0: 131.60246718, wd: 0.00268329,
    O0: 76.67984255, Od: -0.27769418,
  },
  earth: {
    a0: 1.00000261, ad: 0.00000562,
    e0: 0.01671123, ed: -0.00004392,
    I0: -0.00001531, Id: -0.01294668,
    L0: 100.46457166, Ld: 35999.37244981,
    w0: 102.93768193, wd: 0.32327364,
    O0: 0, Od: 0,
  },
  mars: {
    a0: 1.52371034, ad: 0.00001847,
    e0: 0.0933941, ed: 0.00007882,
    I0: 1.84969142, Id: -0.00813131,
    L0: -4.55343205, Ld: 19140.30268499,
    w0: -23.94362959, wd: 0.44441088,
    O0: 49.55953891, Od: -0.29257343,
  },
  jupiter: {
    a0: 5.202887, ad: -0.00011607,
    e0: 0.04838624, ed: -0.00013253,
    I0: 1.30439695, Id: -0.00183714,
    L0: 34.39644051, Ld: 3034.74612775,
    w0: 14.72847983, wd: 0.21252668,
    O0: 100.47390909, Od: 0.20469106,
  },
  saturn: {
    a0: 9.53667594, ad: -0.0012506,
    e0: 0.05386179, ed: -0.00050991,
    I0: 2.48599187, Id: 0.00193609,
    L0: 49.95424423, Ld: 1222.49362201,
    w0: 92.59887831, wd: -0.41897216,
    O0: 113.66242448, Od: -0.28867794,
  },
  uranus: {
    a0: 19.18916464, ad: -0.00196176,
    e0: 0.04725744, ed: -0.00004397,
    I0: 0.77263783, Id: -0.00242939,
    L0: 313.23810451, Ld: 428.48202785,
    w0: 170.9542763, wd: 0.40805281,
    O0: 74.01692503, Od: 0.04240589,
  },
  neptune: {
    a0: 30.06992276, ad: 0.00026291,
    e0: 0.00859048, ed: 0.00005105,
    I0: 1.77004347, Id: 0.00035372,
    L0: -55.12002969, Ld: 218.45945325,
    w0: 44.96476227, wd: -0.32241464,
    O0: 131.78422574, Od: -0.00508664,
  },
  /**
   * Mean orbit at J2000. Semi-major axis, eccentricity, and inclination are
   * consistent with the NASA Pluto fact sheet (a ≈ 39.48 AU, e = 0.244,
   * i = 17.2°). Node, perihelion, and mean longitude follow a standard
   * J2000 mean set; the rate of L matches the fact-sheet period, 90,560 days.
   */
  pluto: {
    a0: 39.482, ad: 0,
    e0: 0.2488, ed: 0,
    I0: 17.16, Id: 0,
    L0: 238.928, Ld: (360 * 36525) / 90560,
    w0: 224.066, wd: 0,
    O0: 110.303, Od: 0,
  },
};

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const DEG = Math.PI / 180;

function wrap180(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** Kepler's equation in degrees, as specified by JPL (tol 1e-6°). */
function eccentricAnomalyDeg(meanDeg: number, e: number): number {
  const eStar = (e * 180) / Math.PI;
  let E = meanDeg + eStar * Math.sin(meanDeg * DEG);
  for (let n = 0; n < 20; n += 1) {
    const dM = meanDeg - (E - eStar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

export function planetEcliptic(
  id: string,
  jd: number,
  meanAnomalyOffsetDeg = 0,
): Vec3 & { r: number } {
  const el = PLANET_ELEMENTS[id];
  if (!el) return { x: 0, y: 0, z: 0, r: 0 };
  const T = (jd - J2000) / 36525;
  const a = el.a0 + el.ad * T;
  const e = Math.min(0.99, Math.max(0, el.e0 + el.ed * T));
  const I = (el.I0 + el.Id * T) * DEG;
  const L = el.L0 + el.Ld * T;
  const wbar = (el.w0 + el.wd * T) * DEG;
  const Om = (el.O0 + el.Od * T) * DEG;
  const Mdeg = wrap180(L - (el.w0 + el.wd * T) + meanAnomalyOffsetDeg);
  const Edeg = eccentricAnomalyDeg(Mdeg, e);
  const E = Edeg * DEG;
  const x1 = a * (Math.cos(E) - e);
  const y1 = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = wbar - Om;
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cosO = Math.cos(Om);
  const sinO = Math.sin(Om);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);
  const x =
    (cosw * cosO - sinw * sinO * cosI) * x1 +
    (-sinw * cosO - cosw * sinO * cosI) * y1;
  const y =
    (cosw * sinO + sinw * cosO * cosI) * x1 +
    (-sinw * sinO + cosw * cosO * cosI) * y1;
  const z = sinw * sinI * x1 + cosw * sinI * y1;
  return { x, y, z, r: Math.hypot(x, y, z) };
}

/**
 * Geocentric Moon, low-precision mean elements (node, perigee, anomaly).
 * Adequate for an orrery; not a substitute for ELP.
 * Semi-major axis 384,748 km.
 */
export function moonEcliptic(jd: number, meanAnomalyOffsetDeg = 0): Vec3 & { r: number } {
  const d = jd - J2000;
  const e = 0.0549;
  const a = 384_748 / 149_597_870.7;
  const I = 5.1454 * DEG;
  const Om = (125.1228 - 0.0529538083 * d) * DEG;
  const wArg = (318.0634 + 0.1643573223 * d) * DEG;
  const Mdeg = wrap180(115.3654 + 13.0649929509 * d + meanAnomalyOffsetDeg);
  const E = eccentricAnomalyDeg(Mdeg, e) * DEG;
  const x1 = a * (Math.cos(E) - e);
  const y1 = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cosw = Math.cos(wArg);
  const sinw = Math.sin(wArg);
  const cosO = Math.cos(Om);
  const sinO = Math.sin(Om);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);
  const x =
    (cosw * cosO - sinw * sinO * cosI) * x1 +
    (-sinw * cosO - cosw * sinO * cosI) * y1;
  const y =
    (cosw * sinO + sinw * cosO * cosI) * x1 +
    (-sinw * sinO + cosw * cosO * cosI) * y1;
  const z = sinw * sinI * x1 + cosw * sinI * y1;
  return { x, y, z, r: Math.hypot(x, y, z) };
}

export function eclipticLongitudeDeg(v: Vec3): number {
  const deg = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export const ORBITERS = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;
