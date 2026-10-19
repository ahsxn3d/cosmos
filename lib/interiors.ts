import type { BodyId } from "./bodies";

/**
 * Interior models, center outward. outerKm is the radius of the top of the layer.
 * Values from NASA Science "Facts" pages (structure sections) unless a layer cites
 * a mission result. Gas-giant boundaries are model-dependent and labelled so.
 */
export interface InteriorLayer {
  name: string;
  outerKm: number;
  composition: string;
  temp: string;
  color: string;
  deep: string;
  /** 0 = smooth fluid/plasma, 1 = rough rock. */
  rough: number;
  /** Real layer too thin to see at true scale; drawn at a minimum width. */
  thin?: boolean;
}

export interface Interior {
  radiusKm: number;
  layers: InteriorLayer[];
  caveat: string;
  sources: { label: string; url: string }[];
}

const N = "https://science.nasa.gov";
const R_SUN = 695700;
const R_J = 69911;
const R_S = 58232;

export const INTERIORS: Record<BodyId, Interior> = {
  sun: {
    radiusKm: R_SUN,
    caveat: "Depths from helioseismology. About 15 million °C at the center, 5,500 °C at the photosphere.",
    layers: [
      { name: "Core", outerKm: 0.25 * R_SUN, composition: "Hydrogen fusing to helium; dense plasma", temp: "~15,000,000 °C", color: "#fff1c4", deep: "#ffd27a", rough: 0 },
      { name: "Radiative zone", outerKm: 0.7 * R_SUN, composition: "Plasma; light random-walks outward for many millennia", temp: "~7,000,000 → 2,000,000 °C", color: "#ffb34d", deep: "#e07a1e", rough: 0 },
      { name: "Convection zone", outerKm: R_SUN - 500, composition: "Turbulent plasma cells rising and sinking", temp: "~2,000,000 → 5,700 °C", color: "#e2561a", deep: "#9c2a08", rough: 0.15 },
      { name: "Photosphere", outerKm: R_SUN, composition: "Visible surface, ~500 km thick, granulation", temp: "~5,500 °C", color: "#ffdf9a", deep: "#ff9d3a", rough: 0, thin: true },
    ],
    sources: [{ label: "NASA Sun facts", url: `${N}/sun/facts/` }],
  },
  mercury: {
    radiusKm: 2440,
    caveat: "Metallic core about 2,074 km in radius, 85% of the planet, partly molten. Mantle and crust together are only ~400 km.",
    layers: [
      { name: "Solid inner core", outerKm: 1000, composition: "Solid iron (MESSENGER-based models)", temp: "model", color: "#d9c7a8", deep: "#b49a72", rough: 0.1 },
      { name: "Liquid outer core", outerKm: 2074, composition: "Molten iron with sulfur; weak magnetic field", temp: "model", color: "#c98a4b", deep: "#8f5528", rough: 0 },
      { name: "Mantle", outerKm: 2405, composition: "Silicate rock", temp: "model", color: "#8a5c44", deep: "#5c3b2b", rough: 0.8 },
      { name: "Crust", outerKm: 2440, composition: "Low-iron silicates, ~35 km; cratered, scarps", temp: "430 °C day / −180 °C night", color: "#9c9086", deep: "#6e655d", rough: 1, thin: true },
    ],
    sources: [{ label: "NASA Mercury facts", url: `${N}/mercury/facts/` }],
  },
  venus: {
    radiusKm: 6051.8,
    caveat: "No seismic data yet. NASA: iron core, hot-rock mantle, a thin rocky crust, like Earth.",
    layers: [
      { name: "Iron core", outerKm: 3200, composition: "Iron-nickel, possibly partly liquid", temp: "model", color: "#d8b77a", deep: "#a07a3e", rough: 0 },
      { name: "Mantle", outerKm: 6021, composition: "Hot silicate rock", temp: "model", color: "#a1543a", deep: "#6b3122", rough: 0.7 },
      { name: "Crust", outerKm: 6051.8, composition: "Basalt, ~10–30 km; volcanic plains, tesserae", temp: "464 °C surface", color: "#c8a26a", deep: "#8b6a40", rough: 1, thin: true },
    ],
    sources: [{ label: "NASA Venus facts", url: `${N}/venus/facts/` }],
  },
  earth: {
    radiusKm: 6371,
    caveat: "Measured by seismology. Average crust ~30 km; oceanic crust thinner, continents thicker.",
    layers: [
      { name: "Inner core", outerKm: 1221, composition: "Solid iron-nickel", temp: "~5,400 °C", color: "#fff0c2", deep: "#f2c66b", rough: 0.05 },
      { name: "Outer core", outerKm: 3480, composition: "Liquid iron-nickel; drives the magnetic field", temp: "~4,500 → 3,700 °C", color: "#ff9b3d", deep: "#c4561a", rough: 0 },
      { name: "Lower mantle", outerKm: 5711, composition: "Solid silicates that creep slowly", temp: "~3,700 → 1,900 °C", color: "#d0582e", deep: "#8e2e18", rough: 0.4 },
      { name: "Upper mantle", outerKm: 6341, composition: "Peridotite; asthenosphere flows", temp: "~1,900 → 500 °C", color: "#a3442a", deep: "#6a2a1a", rough: 0.6 },
      { name: "Crust", outerKm: 6371, composition: "Granite continents, basalt ocean floor", temp: "15 °C mean surface", color: "#5f7a52", deep: "#3d5136", rough: 1, thin: true },
    ],
    sources: [{ label: "NASA Earth facts", url: `${N}/earth/facts/` }],
  },
  moon: {
    radiusKm: 1737.4,
    caveat: "Apollo seismometers and GRAIL gravity. Crust ~40 km near side, up to ~60 km far side.",
    layers: [
      { name: "Inner core", outerKm: 240, composition: "Solid, iron-rich", temp: "model", color: "#e6d2a8", deep: "#b49a6c", rough: 0.1 },
      { name: "Fluid outer core", outerKm: 330, composition: "Liquid iron shell, ~90 km", temp: "model", color: "#d08a4a", deep: "#8d5426", rough: 0 },
      { name: "Partial melt", outerKm: 480, composition: "Partially molten silicate layer", temp: "model", color: "#a35a3a", deep: "#6e3522", rough: 0.4 },
      { name: "Mantle", outerKm: 1690, composition: "Olivine and pyroxene", temp: "model", color: "#7d6b5c", deep: "#4f4339", rough: 0.8 },
      { name: "Crust", outerKm: 1737.4, composition: "Anorthosite highlands, basalt maria", temp: "120 °C day / −130 °C night", color: "#b5b0a8", deep: "#7e7a74", rough: 1, thin: true },
    ],
    sources: [{ label: "NASA Moon facts", url: `${N}/moon/facts/` }],
  },
  mars: {
    radiusKm: 3389.5,
    caveat: "NASA lists a 1,500–2,100 km core radius; InSight seismology measured ~1,830 km.",
    layers: [
      { name: "Liquid core", outerKm: 1830, composition: "Iron, nickel and sulfur (InSight)", temp: "model", color: "#e8a65a", deep: "#a8642a", rough: 0 },
      { name: "Mantle", outerKm: 3360, composition: "Silicate rock, 1,240–1,880 km thick", temp: "model", color: "#9c4a30", deep: "#62291b", rough: 0.75 },
      { name: "Crust", outerKm: 3389.5, composition: "Fe, Mg, Al, Ca, K rock; 10–50 km", temp: "−65 °C mean surface", color: "#c4683e", deep: "#7c3a1f", rough: 1, thin: true },
    ],
    sources: [
      { label: "NASA Mars facts", url: `${N}/mars/facts/` },
      { label: "NASA InSight", url: `${N}/mission/insight/` },
    ],
  },
  jupiter: {
    radiusKm: R_J,
    caveat: "Juno found a dilute core blended into the envelope. Metallic hydrogen begins perhaps halfway down (NASA). Boundaries are model ranges.",
    layers: [
      { name: "Dilute core", outerKm: 0.4 * R_J, composition: "Rock and ice mixed with hydrogen (Juno)", temp: "model", color: "#e7d2b0", deep: "#b0906a", rough: 0.15 },
      { name: "Metallic hydrogen", outerKm: 0.8 * R_J, composition: "Liquid metallic hydrogen; magnetic dynamo", temp: "model", color: "#9aa3b5", deep: "#5d6578", rough: 0 },
      { name: "Molecular hydrogen", outerKm: R_J - 100, composition: "Liquid then gaseous H₂ and helium", temp: "→ −110 °C", color: "#d0a978", deep: "#8a6a46", rough: 0 },
      { name: "Cloud deck", outerKm: R_J, composition: "Ammonia and water clouds", temp: "−110 °C", color: "#e4cfae", deep: "#b98d64", rough: 0, thin: true },
    ],
    sources: [
      { label: "NASA Jupiter facts", url: `${N}/jupiter/facts/` },
      { label: "NASA Juno", url: `${N}/mission/juno/` },
    ],
  },
  saturn: {
    radiusKm: R_S,
    caveat: "NASA: a dense iron-nickel and rock core inside liquid metallic hydrogen, inside liquid hydrogen. Boundaries are model ranges.",
    layers: [
      { name: "Dense core", outerKm: 0.25 * R_S, composition: "Iron, nickel, rock, compressed ices", temp: "model", color: "#d9c3a0", deep: "#a58a64", rough: 0.4 },
      { name: "Metallic hydrogen", outerKm: 0.6 * R_S, composition: "Liquid metallic hydrogen", temp: "model", color: "#9ea3b0", deep: "#626774", rough: 0 },
      { name: "Molecular hydrogen", outerKm: R_S - 100, composition: "Liquid then gaseous H₂ and helium", temp: "→ −140 °C", color: "#e2c794", deep: "#a58a5c", rough: 0 },
      { name: "Cloud deck", outerKm: R_S, composition: "Ammonia ice clouds", temp: "−140 °C", color: "#efe0bb", deep: "#c4ac80", rough: 0, thin: true },
    ],
    sources: [{ label: "NASA Saturn facts", url: `${N}/saturn/facts/` }],
  },
  uranus: {
    radiusKm: 25362,
    caveat: "NASA: 80%+ of the mass is a hot dense fluid of water, methane and ammonia over a small rocky core near 4,982 °C.",
    layers: [
      { name: "Rocky core", outerKm: 0.2 * 25362, composition: "Rock and iron", temp: "~4,982 °C", color: "#c9b79a", deep: "#8f7c60", rough: 0.6 },
      { name: "Icy mantle", outerKm: 0.75 * 25362, composition: "Hot dense fluid: water, ammonia, methane", temp: "model", color: "#5f9aa8", deep: "#2f5f6b", rough: 0 },
      { name: "H/He envelope", outerKm: 25362, composition: "Hydrogen, helium, methane", temp: "−195 °C", color: "#a8dde0", deep: "#6aa8ad", rough: 0 },
    ],
    sources: [{ label: "NASA Uranus facts", url: `${N}/uranus/facts/` }],
  },
  neptune: {
    radiusKm: 24622,
    caveat: "NASA: 80%+ of the mass is icy fluid over a solid core of about one Earth mass; possibly a super-hot water ocean.",
    layers: [
      { name: "Rocky core", outerKm: 0.25 * 24622, composition: "Rock and iron, ~1 Earth mass", temp: "model", color: "#c6b49a", deep: "#8c7a60", rough: 0.6 },
      { name: "Icy mantle", outerKm: 0.8 * 24622, composition: "Super-hot water, ammonia, methane", temp: "model", color: "#3c66a8", deep: "#1e3a6e", rough: 0 },
      { name: "H/He envelope", outerKm: 24622, composition: "Hydrogen, helium, methane", temp: "−200 °C", color: "#5b84d8", deep: "#2f4f98", rough: 0 },
    ],
    sources: [{ label: "NASA Neptune facts", url: `${N}/neptune/facts/` }],
  },
  pluto: {
    radiusKm: 1188.3,
    caveat: "NASA: probably a rocky core in a water-ice mantle, coated with methane and nitrogen frost. A buried ocean is proposed.",
    layers: [
      { name: "Rocky core", outerKm: 850, composition: "Silicate rock", temp: "model", color: "#9c8770", deep: "#6a5a48", rough: 0.8 },
      { name: "Possible ocean", outerKm: 950, composition: "Salty liquid water (proposed)", temp: "model", color: "#4a78a0", deep: "#2a4a6a", rough: 0 },
      { name: "Water-ice mantle", outerKm: 1180, composition: "Water ice", temp: "model", color: "#c8d6e0", deep: "#8ea2b0", rough: 0.3 },
      { name: "Volatile ice crust", outerKm: 1188.3, composition: "Nitrogen, methane and CO frost", temp: "−226 to −240 °C", color: "#e8dccb", deep: "#b8a48a", rough: 0.6, thin: true },
    ],
    sources: [{ label: "NASA Pluto facts", url: `${N}/dwarf-planets/pluto/facts/` }],
  },
};
