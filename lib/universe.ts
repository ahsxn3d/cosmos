/**
 * Objects beyond the planets. Positions are J2000 equatorial (RA/Dec) with
 * distances from NASA Science pages; star data from the HYG v4.1 catalog
 * (astronexus, CC BY-SA 4.0: Hipparcos, Yale, Gliese).
 */
export const LY_AU = 63_241.077;

export interface UObj {
  id: string;
  name: string;
  kind: string;
  raDeg: number;
  decDeg: number;
  /** Distance in light-years (0 = centred on the Sun). */
  ly: number;
  /** log10(view radius in AU) that frames it. */
  zoom: number;
  facts: string[];
  source: { label: string; url: string };
}

const N = "https://science.nasa.gov";

export const GAL_CENTER = { raDeg: 266.405, decDeg: -28.936 };
export const GAL_NORTH = { raDeg: 192.859, decDeg: 27.128 };

export const UOBJS: UObj[] = [
  { id: "heliosphere", name: "Heliopause", kind: "Edge of the Sun's wind", raDeg: 0, decDeg: 0, ly: 0, zoom: 2.6, facts: ["Voyager 1 crossed it on 25 Aug 2012 at about 121.6 AU; Voyager 2 on 5 Nov 2018 at about 119 AU.", "Beyond it the solar wind gives way to the interstellar medium."], source: { label: "NASA: Voyager interstellar", url: `${N}/mission/voyager/` } },
  { id: "oort", name: "Oort Cloud", kind: "Theorized comet reservoir", raDeg: 0, decDeg: 0, ly: 0, zoom: 5.2, facts: ["Thought to extend from roughly 2,000–5,000 AU out to 10,000–100,000 AU.", "Never directly observed; inferred from the orbits of long-period comets.", "The dots drawn here are a model based on that inferred size range, not observed objects."], source: { label: "NASA: Oort Cloud", url: `${N}/solar-system/oort-cloud/` } },
  { id: "proxima", name: "Proxima Centauri", kind: "M5.5 red dwarf", raDeg: 217.429, decDeg: -62.68, ly: 4.24, zoom: 5.7, facts: ["The nearest star to the Sun, 4.24 light-years away.", "Hosts Proxima b, an Earth-mass planet in the habitable zone, found in 2016."], source: { label: "NASA: Proxima Centauri b", url: `${N}/exoplanet-catalog/proxima-centauri-b/` } },
  { id: "sirius", name: "Sirius", kind: "A1V star + white dwarf", raDeg: 101.287, decDeg: -16.716, ly: 8.6, zoom: 6.2, facts: ["The brightest star in the night sky, 8.6 light-years away.", "Its companion Sirius B is a white dwarf about the size of Earth."], source: { label: "HYG star catalog", url: "https://github.com/astronexus/HYG-Database" } },
  { id: "betelgeuse", name: "Betelgeuse", kind: "M2 red supergiant", raDeg: 88.793, decDeg: 7.407, ly: 550, zoom: 7.9, facts: ["A red supergiant several hundred light-years away (estimates ~500–650 ly).", "Dimmed sharply in 2019–20 when it ejected a dust cloud, seen by Hubble."], source: { label: "NASA Hubble: Betelgeuse", url: `${N}/missions/hubble/` } },
  { id: "galcenter", name: "Sagittarius A*", kind: "Supermassive black hole", raDeg: 266.417, decDeg: -29.008, ly: 26000, zoom: 9.6, facts: ["About 4 million solar masses at the center of the Milky Way, ~26,000 ly away.", "Imaged by the Event Horizon Telescope, published May 2022."], source: { label: "NASA: black holes", url: `${N}/universe/black-holes/` } },
  { id: "milkyway", name: "Milky Way", kind: "Barred spiral galaxy", raDeg: 266.405, decDeg: -28.936, ly: 26000, zoom: 10.0, facts: ["About 100,000 light-years across with hundreds of billions of stars.", "The Sun orbits the center once every ~230 million years."], source: { label: "NASA: the Milky Way", url: `${N}/universe/galaxies/` } },
  { id: "lmc", name: "Large Magellanic Cloud", kind: "Satellite galaxy", raDeg: 80.894, decDeg: -69.756, ly: 160000, zoom: 10.6, facts: ["About 160,000 light-years away, visible to the naked eye from the southern hemisphere.", "Site of supernova SN 1987A."], source: { label: "NASA Hubble: LMC", url: `${N}/missions/hubble/` } },
  { id: "smc", name: "Small Magellanic Cloud", kind: "Satellite galaxy", raDeg: 13.187, decDeg: -72.829, ly: 200000, zoom: 10.7, facts: ["About 200,000 light-years away.", "A dwarf irregular galaxy being stretched by the Milky Way and the LMC."], source: { label: "NASA: Small Magellanic Cloud", url: `${N}/missions/hubble/` } },
  { id: "andromeda", name: "Andromeda (M31)", kind: "Spiral galaxy", raDeg: 10.685, decDeg: 41.269, ly: 2500000, zoom: 11.6, facts: ["2.5 million light-years away, the largest galaxy in the Local Group, about 220,000 ly across.", "On course to merge with the Milky Way in roughly 4.5 billion years (Hubble)."], source: { label: "NASA: Andromeda", url: `${N}/missions/hubble/` } },
  { id: "triangulum", name: "Triangulum (M33)", kind: "Spiral galaxy", raDeg: 23.462, decDeg: 30.66, ly: 2730000, zoom: 11.6, facts: ["About 2.7–3 million light-years away; third-largest Local Group galaxy.", "About 60,000 light-years across."], source: { label: "NASA Hubble: M33", url: `${N}/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-33/` } },
  { id: "virgo", name: "Virgo Cluster", kind: "Galaxy cluster", raDeg: 187.7, decDeg: 12.4, ly: 54000000, zoom: 13.4, facts: ["About 54 million light-years away, with over a thousand galaxies.", "The core of the Local (Virgo) Supercluster; home of M87, whose black hole the EHT imaged in 2019."], source: { label: "NASA: M87", url: `${N}/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/` } },
  { id: "observable", name: "Observable universe", kind: "Cosmic horizon", raDeg: 0, decDeg: 0, ly: 0, zoom: 15.4, facts: ["Light has had 13.8 billion years to travel, but expansion puts the edge about 46.5 billion ly away today.", "Galaxies here are 43,463 real 2MASS Redshift Survey positions (Huchra et al. 2012) out to ~2.4 billion ly; the horizon sphere marks 46.5 billion ly."], source: { label: "NASA WMAP: age of the universe", url: "https://map.gsfc.nasa.gov/universe/uni_age.html" } },
];

export function eqVec(raDeg: number, decDeg: number, r = 1): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  // Scene: x→RA 0h, y→north celestial pole, z→RA 6h (mirrored for right-handed view).
  return [r * Math.cos(dec) * Math.cos(ra), r * Math.sin(dec), -r * Math.cos(dec) * Math.sin(ra)];
}

export function formatSpan(au: number): string {
  const ly = au / LY_AU;
  if (ly < 0.3) return `${Math.round(au).toLocaleString("en-US")} AU`;
  if (ly < 1e6) return `${ly < 10 ? ly.toFixed(1) : Math.round(ly).toLocaleString("en-US")} light-years`;
  if (ly < 1e9) return `${(ly / 1e6).toFixed(ly < 1e7 ? 1 : 0)} Mly`;
  return `${(ly / 1e9).toFixed(1)} Gly`;
}

/**
 * Catalogued deep-sky objects with real images of those exact objects.
 * Positions: J2000 RA/Dec (SIMBAD). Distances and sizes: NASA Hubble Messier
 * catalog / ESO pages as linked. sizeLy is the true diameter; the view enlarges
 * small objects to stay visible and says so.
 */
export interface DsoImage { id: string; url: string; sizeLy: number; credit: string; page: string }

export const DSO_OBJS: UObj[] = [
  { id: "m42", name: "Orion Nebula (M42)", kind: "Emission nebula", raDeg: 83.822, decDeg: -5.391, ly: 1344, zoom: 8.0, facts: ["The nearest large star-forming region, about 1,344 light-years away and ~24 ly across.", "Image: NASA/ESA Hubble 2006 mosaic."], source: { label: "NASA Hubble: Messier 42", url: "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/" } },
  { id: "carina", name: "Carina Nebula (NGC 3372)", kind: "Emission nebula", raDeg: 161.265, decDeg: -59.867, ly: 7500, zoom: 9.0, facts: ["About 7,500 light-years away and roughly 230 ly across (2° on the sky), home of Eta Carinae.", "Image: ESO (CC BY 4.0)."], source: { label: "ESO: Carina Nebula", url: "https://www.eso.org/public/images/eso0905a/" } },
  { id: "m16", name: "Eagle Nebula (M16)", kind: "Emission nebula + cluster", raDeg: 274.7, decDeg: -13.807, ly: 7000, zoom: 9.0, facts: ["About 7,000 light-years away, ~70 × 55 ly; contains the Pillars of Creation.", "Image: ESO (CC BY 4.0)."], source: { label: "NASA Hubble: Messier 16", url: "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-16/" } },
  { id: "m1", name: "Crab Nebula (M1)", kind: "Supernova remnant", raDeg: 83.633, decDeg: 22.015, ly: 6500, zoom: 9.0, facts: ["Remnant of the supernova recorded in 1054 CE, about 6,500 light-years away and ~11 ly across.", "Image: NASA/ESA Hubble."], source: { label: "NASA Hubble: Messier 1", url: "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-1/" } },
  { id: "helix", name: "Helix Nebula (NGC 7293)", kind: "Planetary nebula", raDeg: 337.411, decDeg: -20.837, ly: 650, zoom: 7.6, facts: ["One of the nearest planetary nebulae, about 650 light-years away and ~2.5 ly across.", "Image: NASA/ESA Hubble + NOAO (2004)."], source: { label: "NASA: Helix Nebula", url: "https://science.nasa.gov/image-detail/amf-gsfc-20171208-d00062-a-hubble-helix-nebula/" } },
  { id: "m57", name: "Ring Nebula (M57)", kind: "Planetary nebula", raDeg: 283.396, decDeg: 33.029, ly: 2570, zoom: 8.4, facts: ["A dying Sun-like star's shell, about 2,570 light-years away and ~1.3 ly across.", "Image: Hubble Heritage Team (AURA/STScI/NASA)."], source: { label: "NASA Hubble: Messier 57", url: "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-57/" } },
  { id: "m45", name: "Pleiades (M45)", kind: "Open star cluster", raDeg: 56.75, decDeg: 24.117, ly: 444, zoom: 7.4, facts: ["A young open cluster about 444 light-years away; its bright stars span ~14 ly.", "Image: NASA/ESA/AURA/Caltech (Palomar)."], source: { label: "NASA Hubble: Messier 45", url: "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-45/" } },
  { id: "omegacen", name: "Omega Centauri (NGC 5139)", kind: "Globular cluster", raDeg: 201.697, decDeg: -47.479, ly: 17090, zoom: 9.6, facts: ["The Milky Way's largest globular cluster: ~10 million stars, ~150 ly across, about 17,000 light-years away.", "Image: ESO (CC BY 4.0)."], source: { label: "NASA: Omega Centauri", url: "https://science.nasa.gov/missions/hubble/hubble-finds-intermediate-mass-black-hole-in-omega-centauri/" } },
];

export const DSO_IMAGES: DsoImage[] = [
  { id: "m42", url: "/textures/dso/m42.webp", sizeLy: 24, credit: "NASA, ESA, M. Robberto (STScI/ESA), Hubble Orion Treasury Team", page: "https://commons.wikimedia.org/wiki/File:Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg" },
  { id: "carina", url: "/textures/dso/carina.webp", sizeLy: 230, credit: "ESO, CC BY 4.0", page: "https://commons.wikimedia.org/wiki/File:Carina_Nebula_by_ESO.jpg" },
  { id: "m16", url: "/textures/dso/m16.webp", sizeLy: 70, credit: "ESO, CC BY 4.0", page: "https://commons.wikimedia.org/wiki/File:Eagle_Nebula_from_ESO.jpg" },
  { id: "m1", url: "/textures/dso/m1.webp", sizeLy: 11, credit: "NASA, ESA, Hubble", page: "https://commons.wikimedia.org/wiki/File:Crab_Nebula.jpg" },
  { id: "helix", url: "/textures/dso/helix.webp", sizeLy: 2.5, credit: "NASA, ESA, Hubble (proposal 9700)", page: "https://commons.wikimedia.org/wiki/File:NGC7293_(2004).jpg" },
  { id: "m57", url: "/textures/dso/m57.webp", sizeLy: 1.3, credit: "Hubble Heritage Team (AURA/STScI/NASA)", page: "https://commons.wikimedia.org/wiki/File:M57_The_Ring_Nebula.JPG" },
  { id: "m45", url: "/textures/dso/m45.webp", sizeLy: 14, credit: "NASA, ESA, AURA/Caltech, Palomar Observatory", page: "https://commons.wikimedia.org/wiki/File:Pleiades_large.jpg" },
  { id: "omegacen", url: "/textures/dso/omegacen.webp", sizeLy: 150, credit: "ESO, CC BY 4.0", page: "https://commons.wikimedia.org/wiki/File:Omega_Centauri_by_ESO.jpg" },
];

export const HUDF = { id: "hudf", name: "Hubble Ultra Deep Field", kind: "Deep field (~10,000 galaxies)", raDeg: 53.162, decDeg: -27.791, ly: 0, zoom: 15.0, facts: ["A 2.4-arcminute patch of sky in Fornax holding about 10,000 galaxies; the faintest light left them over 13 billion years ago.", "Drawn at its real direction, enlarged and placed at the 13-billion-year light-travel distance."], source: { label: "NASA: Hubble Ultra Deep Field 2014", url: "https://science.nasa.gov/asset/hubble/hubble-ultra-deep-field-2014/" } } satisfies UObj;

// Make catalogued objects selectable through the same panel as the rest.
UOBJS.push(...DSO_OBJS, HUDF);
