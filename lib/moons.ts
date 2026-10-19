import type { BodyId } from "./bodies";
import { visualRadius } from "./scale";
import SATS from "./data/satellites.json";

/**
 * Major moons. Mean radius, semi-major axis and sidereal period follow the
 * JPL Solar System Dynamics planetary satellite tables (physical parameters
 * and mean orbital elements). Discovery and character follow NASA Science
 * moon pages. Negative period means a retrograde orbit.
 *
 * Sources:
 *  https://ssd.jpl.nasa.gov/sats/phys_par/
 *  https://ssd.jpl.nasa.gov/sats/elem/
 *  https://science.nasa.gov/solar-system/moons/
 */

export type MoonType =
  | "Rocky"
  | "Captured irregular"
  | "Volcanic"
  | "Ocean world"
  | "Icy"
  | "Icy, cratered"
  | "Atmosphere world"
  | "Inner shepherd"
  | "Captured, retrograde"
  | "Binary companion";

export interface MoonData {
  id: string;
  name: string;
  parent: BodyId;
  type: MoonType;
  radiusKm: number;
  /** Semi-major axis, km. */
  aKm: number;
  /** Sidereal orbital period, days. Negative is retrograde. */
  periodDays: number;
  discovered: string;
  color: string;
  /** Second tone for procedural surfaces (Iapetus dark side, Io sulfur, etc). */
  accent: string;
  note: string;
  url: string;
  /** Triaxial radii, km (JPL SSD / mission shape fits). Irregular bodies only. */
  axesKm?: [number, number, number];
  /** Set for the JPL-catalogued small satellites rendered as instances. */
  minor?: MinorOrbit;
}

/** JPL SSD mean elements (https://ssd.jpl.nasa.gov/sats/elem/), epoch J2000. */
export interface MinorOrbit {
  code: string;
  frame: string;
  group: string;
  e: number;
  i: number;
  node: number;
  w: number;
  M: number;
  /** True when JPL lists a mean radius; otherwise the size is unmeasured. */
  radiusKnown: boolean;
}

const N = "https://science.nasa.gov";

export const MOONS: MoonData[] = [
  { axesKm: [13.0, 11.4, 9.1], id: "phobos", name: "Phobos", parent: "mars", type: "Captured irregular", radiusKm: 11.08, aKm: 9376, periodDays: 0.319, discovered: "1877, Asaph Hall", color: "#6f655b", accent: "#3e3832", note: "Orbits faster than Mars spins and is spiraling inward about 1.8 m per century. Stickney crater spans almost half its width. Origin, capture or impact debris, is still debated.", url: `${N}/mars/moons/phobos/` },
  { axesKm: [7.8, 6.0, 5.1], id: "deimos", name: "Deimos", parent: "mars", type: "Captured irregular", radiusKm: 6.2, aKm: 23463, periodDays: 1.263, discovered: "1877, Asaph Hall", color: "#8a7e70", accent: "#5c5248", note: "Smooth, dust-blanketed and lumpy. It slowly drifts outward from Mars.", url: `${N}/mars/moons/deimos/` },

  { axesKm: [125, 73, 64], id: "amalthea", name: "Amalthea", parent: "jupiter", type: "Inner shepherd", radiusKm: 83.5, aKm: 181366, periodDays: 0.498, discovered: "1892, E. E. Barnard", color: "#8a3e2a", accent: "#4d241a", note: "The reddest object in the solar system, sprayed with sulfur from Io. Its dust feeds Jupiter's gossamer ring.", url: `${N}/jupiter/moons/amalthea/` },
  { id: "io", name: "Io", parent: "jupiter", type: "Volcanic", radiusKm: 1821.6, aKm: 421800, periodDays: 1.769, discovered: "1610, Galileo Galilei", color: "#d9c463", accent: "#7a4a1f", note: "The most volcanically active body known, with hundreds of volcanoes and lava fountains tens of kilometers high, heated by tides from Jupiter.", url: `${N}/jupiter/moons/io/` },
  { id: "europa", name: "Europa", parent: "jupiter", type: "Ocean world", radiusKm: 1560.8, aKm: 671100, periodDays: 3.551, discovered: "1610, Galileo Galilei", color: "#d8cdb8", accent: "#8a5a3c", note: "An ice shell over a global salt-water ocean with likely twice the water of Earth's oceans. Europa Clipper (launched 2024) arrives in 2030.", url: `${N}/jupiter/moons/europa/` },
  { id: "ganymede", name: "Ganymede", parent: "jupiter", type: "Ocean world", radiusKm: 2631.2, aKm: 1070400, periodDays: 7.155, discovered: "1610, Galileo Galilei", color: "#9a8f80", accent: "#5e564c", note: "The largest moon in the solar system, bigger than Mercury, and the only moon with its own magnetic field. A buried saltwater ocean is likely.", url: `${N}/jupiter/moons/ganymede/` },
  { id: "callisto", name: "Callisto", parent: "jupiter", type: "Icy, cratered", radiusKm: 2410.3, aKm: 1882700, periodDays: 16.689, discovered: "1610, Galileo Galilei", color: "#5d5448", accent: "#c9c0b0", note: "The most heavily cratered object known. Its surface is about 4 billion years old and shows almost no geologic activity.", url: `${N}/jupiter/moons/callisto/` },
  { axesKm: [75, 60, 60], id: "himalia", name: "Himalia", parent: "jupiter", type: "Captured irregular", radiusKm: 69.8, aKm: 11460000, periodDays: 250.2, discovered: "1904, C. D. Perrine", color: "#6e675e", accent: "#4a453f", note: "Largest of Jupiter's distant irregular moons, probably a captured asteroid fragment.", url: `${N}/jupiter/moons/himalia/` },

  { id: "mimas", name: "Mimas", parent: "saturn", type: "Icy, cratered", radiusKm: 198.2, aKm: 185540, periodDays: 0.942, discovered: "1789, William Herschel", color: "#c9c6c0", accent: "#8e8a84", note: "Herschel crater is a third of its diameter. Cassini data hint at a young ocean under the ice.", url: `${N}/saturn/moons/mimas/` },
  { id: "enceladus", name: "Enceladus", parent: "saturn", type: "Ocean world", radiusKm: 252.1, aKm: 238040, periodDays: 1.37, discovered: "1789, William Herschel", color: "#f4f6f8", accent: "#a9c4d8", note: "The most reflective body in the solar system. Geysers at the south pole vent a subsurface ocean into space and feed Saturn's E ring.", url: `${N}/saturn/moons/enceladus/` },
  { id: "tethys", name: "Tethys", parent: "saturn", type: "Icy", radiusKm: 531.1, aKm: 294670, periodDays: 1.888, discovered: "1684, G. D. Cassini", color: "#dcd9d2", accent: "#9c978e", note: "Almost pure water ice. Ithaca Chasma runs three quarters of the way around it.", url: `${N}/saturn/moons/tethys/` },
  { id: "dione", name: "Dione", parent: "saturn", type: "Icy", radiusKm: 561.4, aKm: 377420, periodDays: 2.737, discovered: "1684, G. D. Cassini", color: "#cfcbc4", accent: "#8c877f", note: "Bright ice cliffs streak its trailing side. It may hold a deep ocean.", url: `${N}/saturn/moons/dione/` },
  { id: "rhea", name: "Rhea", parent: "saturn", type: "Icy, cratered", radiusKm: 763.5, aKm: 527070, periodDays: 4.518, discovered: "1672, G. D. Cassini", color: "#c4c0b8", accent: "#7d7870", note: "Saturn's second-largest moon, a cold, cratered ball of ice and rock with a tenuous oxygen exosphere.", url: `${N}/saturn/moons/rhea/` },
  { id: "titan", name: "Titan", parent: "saturn", type: "Atmosphere world", radiusKm: 2574.7, aKm: 1221870, periodDays: 15.945, discovered: "1655, Christiaan Huygens", color: "#d39a45", accent: "#7a4f1e", note: "Larger than Mercury, with a nitrogen atmosphere 1.5 times Earth's surface pressure, methane rain and lakes, and an ocean under the ice. Dragonfly launches in 2028.", url: `${N}/saturn/moons/titan/` },
  { axesKm: [180.1, 133, 102.7], id: "hyperion", name: "Hyperion", parent: "saturn", type: "Icy, cratered", radiusKm: 135, aKm: 1481010, periodDays: 21.277, discovered: "1848, W. C. Bond, G. P. Bond and W. Lassell", color: "#b79d7f", accent: "#5e4c3a", note: "A sponge-like, irregular moon about 360 × 266 × 205 km that tumbles chaotically. Its density is so low that much of its interior is probably empty space. It was the first non-round moon discovered.", url: `${N}/saturn/moons/hyperion/` },
  { id: "iapetus", name: "Iapetus", parent: "saturn", type: "Icy", radiusKm: 734.4, aKm: 3560840, periodDays: 79.33, discovered: "1671, G. D. Cassini", color: "#e2ddd3", accent: "#2b211a", note: "Two-toned: one hemisphere is as dark as coal, the other bright ice. An equatorial ridge up to 20 km high wraps around it.", url: `${N}/saturn/moons/iapetus/` },
  { axesKm: [109.4, 108.5, 101.8], id: "phoebe", name: "Phoebe", parent: "saturn", type: "Captured, retrograde", radiusKm: 106.5, aKm: 12947780, periodDays: -550.3, discovered: "1899, W. H. Pickering", color: "#4c4640", accent: "#2c2925", note: "Orbits backwards far from Saturn, likely a captured Kuiper belt object. Dust from it forms the giant Phoebe ring.", url: `${N}/saturn/moons/phoebe/` },

  { id: "miranda", name: "Miranda", parent: "uranus", type: "Icy", radiusKm: 235.8, aKm: 129900, periodDays: 1.413, discovered: "1948, Gerard Kuiper", color: "#b9b6b0", accent: "#77736d", note: "A patchwork of terrains and Verona Rupes, a cliff about 20 km tall, among the highest in the solar system.", url: `${N}/uranus/moons/miranda/` },
  { id: "ariel", name: "Ariel", parent: "uranus", type: "Icy", radiusKm: 578.9, aKm: 190900, periodDays: 2.52, discovered: "1851, William Lassell", color: "#c4c0b9", accent: "#7e7a73", note: "The brightest and youngest-looking surface of Uranus' large moons, cut by canyons.", url: `${N}/uranus/moons/ariel/` },
  { id: "umbriel", name: "Umbriel", parent: "uranus", type: "Icy, cratered", radiusKm: 584.7, aKm: 266000, periodDays: 4.144, discovered: "1851, William Lassell", color: "#5d5a56", accent: "#3a3836", note: "The darkest of the five, old and heavily cratered, with a bright ring called Wunda.", url: `${N}/uranus/moons/umbriel/` },
  { id: "titania", name: "Titania", parent: "uranus", type: "Icy", radiusKm: 788.9, aKm: 436300, periodDays: 8.706, discovered: "1787, William Herschel", color: "#a59d93", accent: "#6a645c", note: "Uranus' largest moon, with fault valleys up to 1,500 km long.", url: `${N}/uranus/moons/titania/` },
  { id: "oberon", name: "Oberon", parent: "uranus", type: "Icy, cratered", radiusKm: 761.4, aKm: 583500, periodDays: 13.463, discovered: "1787, William Herschel", color: "#8e857b", accent: "#55504a", note: "The outermost large moon, old and cratered, with a mountain about 6 km high on its limb.", url: `${N}/uranus/moons/oberon/` },

  { axesKm: [218, 208, 201], id: "proteus", name: "Proteus", parent: "neptune", type: "Inner shepherd", radiusKm: 210, aKm: 117647, periodDays: 1.122, discovered: "1989, Voyager 2", color: "#4e4a46", accent: "#2f2c2a", note: "Dark and box-shaped, about as large as a body can be without pulling itself round.", url: `${N}/neptune/moons/proteus/` },
  { id: "triton", name: "Triton", parent: "neptune", type: "Captured, retrograde", radiusKm: 1353.4, aKm: 354759, periodDays: -5.877, discovered: "1846, William Lassell", color: "#d9cbbd", accent: "#b48a7a", note: "The only large moon with a retrograde orbit, so likely a captured Kuiper belt object. Voyager 2 saw nitrogen geysers. Its surface is about -235 °C.", url: `${N}/neptune/moons/triton/` },
  { id: "nereid", name: "Nereid", parent: "neptune", type: "Captured irregular", radiusKm: 178.5, aKm: 5513818, periodDays: 360.13, discovered: "1949, Gerard Kuiper", color: "#8a8580", accent: "#5a5652", note: "One of the most eccentric orbits of any moon, swinging from 1.4 to 9.7 million km from Neptune.", url: `${N}/neptune/moons/nereid/` },

  { id: "charon", name: "Charon", parent: "pluto", type: "Binary companion", radiusKm: 606, aKm: 19591, periodDays: 6.387, discovered: "1978, James Christy", color: "#a9a49e", accent: "#6e3f2e", note: "Half Pluto's size, so the pair orbits a point between them. Both are locked face to face. Its reddish pole, Mordor Macula, is stained by gas escaping Pluto.", url: `${N}/dwarf-planets/pluto/moons/charon/` },
  { axesKm: [24.9, 16.6, 15.6], id: "nix", name: "Nix", parent: "pluto", type: "Icy", radiusKm: 19.3, aKm: 48694, periodDays: 24.855, discovered: "2005, Hubble team", color: "#d6d3ce", accent: "#9b968e", note: "A small, elongated chunk of water ice that tumbles chaotically.", url: `${N}/dwarf-planets/pluto/moons/nix/` },
  { axesKm: [25.5, 18.1, 15.5], id: "hydra", name: "Hydra", parent: "pluto", type: "Icy", radiusKm: 19.0, aKm: 64738, periodDays: 38.202, discovered: "2005, Hubble team", color: "#dedbd6", accent: "#a29d96", note: "Outermost known moon of Pluto, coated in nearly pure water ice.", url: `${N}/dwarf-planets/pluto/moons/hydra/` },
];

export const MOON_SOURCES = [
  { label: "JPL SSD satellite physical parameters", url: "https://ssd.jpl.nasa.gov/sats/phys_par/" },
  { label: "JPL SSD satellite mean elements", url: "https://ssd.jpl.nasa.gov/sats/elem/" },
  { label: "NASA Science: moons", url: "https://science.nasa.gov/solar-system/moons/" },
];

type SatRow = { id: string; name: string; planet: string; code: string; frame: string; a: number; e: number; w: number; M: number; i: number; node: number; P: number; r: number | null; group: string };
const JPL_ELEM = "https://ssd.jpl.nasa.gov/sats/elem/";
const majorNames = new Set(MOONS.map((m) => m.name.toLowerCase()));

/** Every other satellite with a JPL mean-element orbit (Mars to Pluto). */
export const MINOR_MOONS: MoonData[] = (SATS as SatRow[])
  .filter((s) => !majorNames.has(s.name.toLowerCase()))
  .map((s) => {
    const retro = s.i > 90;
    const irregular = s.group !== "regular";
    const name = s.name.replace(/^S(\d{4})_?([A-Z])_?(\d+)$/, "S/$1 $2 $3");
    return {
      id: `sat-${s.code}`,
      name,
      parent: s.planet as BodyId,
      type: irregular ? (retro ? "Captured, retrograde" : "Captured irregular") : s.a < 300000 ? "Inner shepherd" : "Icy",
      radiusKm: s.r ?? 0,
      aKm: s.a,
      periodDays: retro ? -s.P : s.P,
      discovered: "See JPL / IAU MPC record",
      color: "#8d877f",
      accent: "#5a5650",
      note: `${s.group[0].toUpperCase()}${s.group.slice(1)} satellite (JPL code ${s.code}). Mean elements: a = ${Math.round(s.a).toLocaleString("en-US")} km, e = ${s.e}, i = ${s.i}° (${s.frame} frame), period ${s.P} d${retro ? ", retrograde" : ""}.${s.r ? "" : " JPL lists no measured radius; it is drawn at a minimum visible size."}`,
      url: JPL_ELEM,
      minor: { code: s.code, frame: s.frame, group: s.group, e: s.e, i: s.i, node: s.node, w: s.w, M: s.M, radiusKnown: s.r != null },
    } satisfies MoonData;
  });

export function minorMoonsOf(id: BodyId): MoonData[] {
  return MINOR_MOONS.filter((m) => m.parent === id);
}

/** All satellites of a body, major first, then grouped by JPL-derived family. */
export function moonCount(id: BodyId): number {
  return moonsOf(id).length + minorMoonsOf(id).length;
}

export function moonsOf(id: BodyId): MoonData[] {
  return MOONS.filter((moon) => moon.parent === id);
}

export function moonById(id: string | null): MoonData | null {
  if (!id) return null;
  return MOONS.find((moon) => moon.id === id) ?? MINOR_MOONS.find((moon) => moon.id === id) ?? null;
}

export const PLANET_RADIUS_KM: Partial<Record<BodyId, number>> = {
  mars: 3389.5,
  jupiter: 69911,
  saturn: 58232,
  uranus: 25362,
  neptune: 24622,
  pluto: 1188.3,
};

export function moonOrbitRadius(moon: MoonData): number {
  const rp = PLANET_RADIUS_KM[moon.parent] ?? 1;
  const R = visualRadius(moon.parent);
  return R * (1.55 + 0.95 * Math.log(Math.max(1.2, moon.aKm / rp)));
}

export function moonVisualRadius(moon: MoonData): number {
  const r = Math.sqrt((moon.radiusKm * 2) / 12756) * 0.62;
  return Math.min(Math.max(r, moon.minor ? 0.03 : 0.045), visualRadius(moon.parent) * 0.3);
}

/**
 * Global surface maps (simple cylindrical), downscaled to WebP. All are
 * NASA / JPL / USGS products (public domain) via Wikimedia Commons except
 * Ganymede (Björn Jónsson, from NASA Voyager and Galileo images, attribution)
 * and Deimos (CC BY-SA 3.0). Areas never imaged by a spacecraft (parts of
 * Triton, Charon, Miranda) are filled with the mean surface tone.
 * `tint` multiplies grayscale mosaics (Europa, Titan) toward their true color.
 */
export const MOON_MAPS: Record<string, { url: string; credit: string; page: string; tint?: string }> = {
  io: { url: "/textures/moons/io.webp", credit: "USGS Astrogeology, Galileo/Voyager mosaic", page: "https://commons.wikimedia.org/wiki/File:Io_for_GeoHacks.jpg" },
  europa: { url: "/textures/moons/europa.webp", credit: "NASA/JPL/USGS Voyager map", page: "https://commons.wikimedia.org/wiki/File:Jupiter_II-Europa_map_NASA_JPL_Voyager.jpg", tint: "#e8dcc6" },
  ganymede: { url: "/textures/moons/ganymede.webp", credit: "Björn Jónsson from NASA Voyager/Galileo images", page: "https://commons.wikimedia.org/wiki/File:Map_of_Ganymede_by_Bj%C3%B6rn_J%C3%B3nsson.jpg" },
  titan: { url: "/textures/moons/titan.webp", credit: "NASA/JPL/Space Science Institute, Cassini ISS map", page: "https://commons.wikimedia.org/wiki/File:Titan_map_April_2011_full.png", tint: "#d7a157" },
  enceladus: { url: "/textures/moons/enceladus.webp", credit: "NASA/JPL/Space Science Institute, Cassini", page: "https://commons.wikimedia.org/wiki/File:Enceladus_Color_Map.jpg" },
  mimas: { url: "/textures/moons/mimas.webp", credit: "NASA/JPL/Space Science Institute, PIA18437", page: "https://commons.wikimedia.org/wiki/File:Map_of_Mimas_colorized_2014-04_PIA18437.jpg" },
  tethys: { url: "/textures/moons/tethys.webp", credit: "NASA/JPL/Space Science Institute, Cassini", page: "https://commons.wikimedia.org/wiki/File:Tethys_Color_Map.jpg" },
  dione: { url: "/textures/moons/dione.webp", credit: "NASA/JPL/Space Science Institute, Cassini", page: "https://commons.wikimedia.org/wiki/File:Dione_Color_Map.jpg" },
  rhea: { url: "/textures/moons/rhea.webp", credit: "NASA/JPL/Space Science Institute, Cassini", page: "https://commons.wikimedia.org/wiki/File:Rhea_Color_Map.jpg" },
  iapetus: { url: "/textures/moons/iapetus.webp", credit: "NASA/JPL/Space Science Institute, Cassini", page: "https://commons.wikimedia.org/wiki/File:Iapetus_Color_Map.jpg" },
  miranda: { url: "/textures/moons/miranda.webp", credit: "NASA/JPL/USGS, Voyager 2", page: "https://commons.wikimedia.org/wiki/File:Miranda_map.jpg" },
  triton: { url: "/textures/moons/triton.webp", credit: "NASA/JPL/USGS, Voyager 2", page: "https://commons.wikimedia.org/wiki/File:Triton_map_no_grid.jpg" },
  charon: { url: "/textures/moons/charon.webp", credit: "NASA/JHUAPL/SwRI, New Horizons", page: "https://commons.wikimedia.org/wiki/File:Charon_map_iau1803c.jpg" },
  deimos: { url: "/textures/moons/deimos.webp", credit: "Phil Stooke / NASA Viking data, CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Deimos_color_map.jpg" },
};

const VISITS: Partial<Record<BodyId, string[]>> = {
  mars: ["Mariner 9 (1971), first close-up images", "Viking orbiters (1976–77)", "Mars Express and Mars Reconnaissance Orbiter imaging"],
  jupiter: ["Pioneer 10 and 11 (1973–74)", "Voyager 1 and 2 (1979)", "Galileo orbiter (1995–2003)", "Juno (in orbit since 2016)"],
  saturn: ["Pioneer 11 (1979)", "Voyager 1 (1980) and Voyager 2 (1981)", "Cassini orbiter (2004–2017)"],
  uranus: ["Voyager 2 flyby, January 1986 (the only visit)"],
  neptune: ["Voyager 2 flyby, August 1989 (the only visit)"],
  pluto: ["New Horizons flyby, 14 July 2015"],
};
const EXTRA_VISITS: Record<string, string[]> = {
  europa: ["Europa Clipper (launched Oct 2024, arrives 2030)", "ESA JUICE (launched 2023, arrives 2031)"],
  ganymede: ["ESA JUICE will orbit Ganymede in the 2030s"],
  callisto: ["ESA JUICE flybys in the 2030s"],
  titan: ["Huygens probe landed 14 Jan 2005, the most distant landing ever", "Dragonfly rotorcraft scheduled to launch in 2028"],
};

export interface MoonStory {
  formation: string;
  age: string;
  visits: string[];
}

/** Origin theories follow NASA Science moon pages; ages are model estimates. */
export function moonStory(m: MoonData): MoonStory {
  let formation = "Thought to have formed in the disk of gas and dust around the young planet, alongside it.";
  if (m.parent === "mars") formation = "Origin debated: captured asteroids, or debris thrown up by a giant impact on Mars. JAXA's MMX sample-return mission aims to settle it.";
  else if (m.parent === "pluto") formation = "Most likely assembled from debris of a giant collision between Pluto and another Kuiper belt body.";
  else if (m.id === "triton") formation = "A captured Kuiper belt object: its retrograde, tilted orbit cannot form in a planet's disk.";
  else if (m.id === "hyperion") formation = "Possibly a fragment of a larger moon broken apart by an impact; its chaotic spin is driven by resonance with Titan.";
  else if (m.minor && m.minor.group !== "regular") formation = `A ${m.minor.group} irregular satellite: likely a fragment of a body captured early in the planet\u2019s history and later broken up by collisions, which is why it shares a tilted, distant orbit with its family.`;
  else if (m.type === "Captured irregular" || m.type === "Captured, retrograde") formation = "Likely a captured asteroid or comet-like body, given its distant, tilted or eccentric orbit.";
  return {
    formation,
    age: "≈4.5 billion years (body); surfaces can be far younger where geologically active",
    visits: m.minor ? [] : [...(VISITS[m.parent] ?? []), ...(EXTRA_VISITS[m.id] ?? [])],
  };
}
