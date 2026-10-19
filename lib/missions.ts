/**
 * Spacecraft trajectories: JPL Horizons vector tables (ecliptic J2000),
 * fetched 13 Oct 2026 into /public/data/missions.json. Voyagers and New
 * Horizons are heliocentric (AU); Juno is Jupiter-centered and JWST
 * Earth-centered (km); Parker is heliocentric (AU). Horizons' Parker
 * ephemeris ends 1 Jan 2030 and Juno's 15 Sep 2025.
 * https://ssd.jpl.nasa.gov/horizons/
 */
export type MissionId = "voyager1" | "voyager2" | "newhorizons" | "juno" | "parker" | "jwst";

export interface MissionInfo {
  id: MissionId;
  name: string;
  launched: string;
  status: string;
  facts: string[];
  url: string;
  near: "sun" | "jupiter" | "earth";
}

export const MISSIONS: MissionInfo[] = [
  {
    id: "voyager1",
    name: "Voyager 1",
    launched: "5 Sep 1977",
    status: "Interstellar space since 25 Aug 2012",
    facts: ["Flew past Jupiter (1979) and Saturn (1980), including a close pass of Titan.", "The most distant human-made object."],
    url: "https://science.nasa.gov/mission/voyager/voyager-1/",
    near: "sun",
  },
  {
    id: "voyager2",
    name: "Voyager 2",
    launched: "20 Aug 1977",
    status: "Interstellar space since 5 Nov 2018",
    facts: ["The only spacecraft to visit Uranus (1986) and Neptune (1989).", "Also flew past Jupiter (1979) and Saturn (1981)."],
    url: "https://science.nasa.gov/mission/voyager/voyager-2/",
    near: "sun",
  },
  {
    id: "newhorizons",
    name: "New Horizons",
    launched: "19 Jan 2006",
    status: "Kuiper Belt extended mission",
    facts: ["First flyby of Pluto and Charon, 14 Jul 2015.", "Flew past Kuiper Belt object Arrokoth on 1 Jan 2019."],
    url: "https://science.nasa.gov/mission/new-horizons/",
    near: "sun",
  },
  {
    id: "juno",
    name: "Juno",
    launched: "5 Aug 2011",
    status: "Orbiting Jupiter since 4 Jul 2016",
    facts: ["Polar orbits map Jupiter's gravity, magnetic field and deep atmosphere.", "Close flybys of Ganymede (2021), Europa (2022) and Io (2023–24)."],
    url: "https://science.nasa.gov/mission/juno/",
    near: "jupiter",
  },
  {
    id: "parker",
    name: "Parker Solar Probe",
    launched: "12 Aug 2018",
    status: "Orbiting the Sun",
    facts: ["Closest approach 24 Dec 2024: about 6.1 million km from the Sun's surface.", "Fastest human-made object, about 690,000 km/h at perihelion."],
    url: "https://science.nasa.gov/mission/parker-solar-probe/",
    near: "sun",
  },
  {
    id: "jwst",
    name: "James Webb Space Telescope",
    launched: "25 Dec 2021",
    status: "Halo orbit around Sun–Earth L2",
    facts: ["About 1.5 million km from Earth, on the side away from the Sun.", "6.5 m segmented gold-coated mirror, observing in infrared."],
    url: "https://science.nasa.gov/mission/webb/",
    near: "earth",
  },
];

export interface Track {
  center: string;
  units: "AU" | "km";
  pts: [number, number, number, number][];
}

let cache: Promise<Record<string, Track>> | null = null;

export function loadTracks(): Promise<Record<string, Track>> {
  if (!cache) cache = fetch("/data/missions.json").then((r) => r.json());
  return cache;
}

/** Linear interpolation by Julian Date. Returns null outside the table. */
export function sampleTrack(track: Track | undefined, jd: number): [number, number, number] | null {
  if (!track) return null;
  const p = track.pts;
  if (jd < p[0][0] || jd > p[p.length - 1][0]) return null;
  let lo = 0;
  let hi = p.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p[mid][0] <= jd) lo = mid;
    else hi = mid;
  }
  const a = p[lo];
  const b = p[hi];
  const t = b[0] === a[0] ? 0 : (jd - a[0]) / (b[0] - a[0]);
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

export function missionById(id: string | null): MissionInfo | null {
  return MISSIONS.find((m) => m.id === id) ?? null;
}
