export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export interface Layer {
  name: string;
  /** Diagram radius as a fraction of the globe. Thin shells are thickened so they read. */
  radius: number;
  color: string;
  note: string;
}

export interface TimelineEvent {
  year: string;
  title: string;
  detail: string;
}

export interface Feature {
  title: string;
  detail: string;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface BodyData {
  id: BodyId;
  name: string;
  kind: string;
  /** NSSDCA metric fact sheet. */
  diameterKm: number;
  massMan: string;
  massExp: number;
  gravity: string;
  density: string;
  /** Length of day, hours, from the fact sheet. */
  dayHours: number;
  /** Sidereal rotation, hours. Negative means the fact sheet marks it retrograde. */
  rotationHours: number;
  yearDays: number | null;
  moons: number | null;
  moonsLabel: string;
  tempLabel: string;
  pressure: string;
  obliquity: number;
  rings: "none" | "saturn" | "uranus" | "faint";
  summary: string;
  history: TimelineEvent[];
  layers: Layer[];
  unusual: Feature[];
  /** Dust, accretion, differentiation, today. */
  formation: [string, string, string, string];
  sources: SourceLink[];
}

const FACT = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/";
const MOONS = "https://spaceplace.nasa.gov/how-many-moons/en/";

export const BODY_ORDER: BodyId[] = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

export const BODIES: Record<BodyId, BodyData> = {
  sun: {
    id: "sun",
    name: "Sun",
    kind: "G2V star",
    diameterKm: 1_391_400,
    massMan: "1.9885",
    massExp: 30,
    gravity: "274 m/s²",
    density: "1,408 kg/m³",
    dayHours: 609.12,
    rotationHours: 609.12,
    yearDays: null,
    moons: null,
    moonsLabel: "—",
    tempLabel: "5,500 °C photosphere",
    pressure: "—",
    obliquity: 7.25,
    rings: "none",
    summary:
      "An ordinary yellow dwarf. The photosphere is about 5,500 °C; the corona above it is millions of degrees. Equatorial rotation is about 25 days, faster than the poles.",
    history: [
      { year: "Antiquity", title: "Tracked by every sky culture", detail: "Solstices, eclipses, and the year were measured long before telescopes." },
      { year: "1610", title: "Galileo’s sunspots", detail: "Sunspots showed the Sun rotates and is not a flawless sphere." },
      { year: "1995", title: "SOHO", detail: "The Solar and Heliospheric Observatory began a continuous watch of the corona and solar wind." },
      { year: "2018", title: "Parker Solar Probe", detail: "Launched to fly through the corona, closer than any earlier spacecraft." },
    ],
    layers: [
      { name: "Core", radius: 0.25, color: "#f0d7a4", note: "Fusion. About a quarter of the radius, near 15 million °C." },
      { name: "Radiative zone", radius: 0.7, color: "#e09a55", note: "Energy leaves as photons on a very long random walk." },
      { name: "Convective zone", radius: 1, color: "#c46b32", note: "Plasma rises and sinks. This is the granulation you see." },
    ],
    unusual: [
      { title: "The corona is hotter than the surface", detail: "The visible photosphere is about 5,500 °C. The thin corona above it reaches millions of degrees. How the energy gets there is still an open problem Parker was built to study." },
      { title: "It does not rotate as a solid", detail: "The equator turns in about 25 days. Higher latitudes take more than 30. That differential rotation helps wind the magnetic field." },
      { title: "An 11-year magnetic cycle", detail: "Sunspot counts rise and fall about every 11 years as the magnetic field flips polarity." },
    ],
    formation: [
      "A cold piece of a molecular cloud began to fall inward under its own gravity.",
      "Most of the mass gathered into a protostar. The rest flattened into a disk.",
      "The core grew hot and dense enough for hydrogen fusion to balance gravity.",
      "The Sun today, about 4.6 billion years into core hydrogen burning.",
    ],
    sources: [
      { label: "NASA Sun fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html" },
      { label: "NASA Solar System Exploration: Sun", url: "https://science.nasa.gov/sun/" },
    ],
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    kind: "Terrestrial planet",
    diameterKm: 4879,
    massMan: "3.30",
    massExp: 23,
    gravity: "3.7 m/s²",
    density: "5,429 kg/m³",
    dayHours: 4222.6,
    rotationHours: 1407.6,
    yearDays: 88,
    moons: 0,
    moonsLabel: "0",
    tempLabel: "167 °C mean",
    pressure: "0 bar",
    obliquity: 0.034,
    rings: "none",
    summary:
      "The smallest planet and the closest to the Sun. A solar day lasts 176 Earth days because Mercury is locked in a 3:2 spin-orbit resonance. Dayside temperatures reach about 430 °C; the nightside falls below −170 °C.",
    history: [
      { year: "Antiquity", title: "A naked-eye planet", detail: "Mercury was known across ancient astronomies. It never strays far from the Sun in the sky." },
      { year: "1974", title: "Mariner 10", detail: "Three flybys mapped part of the surface and found a magnetic field." },
      { year: "2011", title: "MESSENGER", detail: "Orbited until 2015, mapped the whole planet, and confirmed water ice in shadowed polar craters." },
      { year: "2026", title: "BepiColombo arrives", detail: "ESA and JAXA. The transfer module separated on 3 September 2026. Mercury orbit insertion is scheduled for 21 November 2026." },
    ],
    layers: [
      { name: "Iron core", radius: 0.82, color: "#c4a27a", note: "Enormous. MESSENGER gravity data put the core near 80% of the radius." },
      { name: "Mantle", radius: 0.96, color: "#8d5b45", note: "A thin rocky shell over the metal." },
      { name: "Crust", radius: 1, color: "#a89480", note: "Ancient, covered in impact basins and contraction scarps. Drawn thicker than it is." },
    ],
    unusual: [
      { title: "Three spins for two orbits", detail: "Mercury rotates three times for every two revolutions. The solar day, noon to noon, is 176 Earth days, longer than the 88-day year." },
      { title: "Ice on the hottest planet", detail: "Crater floors at the poles never see sunlight. Radar and MESSENGER found water ice there, insulated by the vacuum." },
      { title: "A shrinking world", detail: "Lobate scarps are thrust faults. As the interior cooled, the crust wrinkled and the planet contracted." },
    ],
    formation: [
      "Dust and pebbles in the hot inner disk stuck together where metal and rock could survive.",
      "Those clumps grew into planetesimals and then a battered protoplanet.",
      "Metal sank into a huge core. The rocky mantle stayed thin. A later impact may have stripped crust.",
      "Mercury today: a dense iron world on a 7° inclined, noticeably eccentric orbit.",
    ],
    sources: [
      { label: "NASA Mercury fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html" },
      { label: "NASA BepiColombo", url: "https://science.nasa.gov/mission/bepicolombo/" },
    ],
  },
  venus: {
    id: "venus",
    name: "Venus",
    kind: "Terrestrial planet",
    diameterKm: 12104,
    massMan: "4.87",
    massExp: 24,
    gravity: "8.9 m/s²",
    density: "5,243 kg/m³",
    dayHours: 2802,
    rotationHours: -5832.5,
    yearDays: 224.7,
    moons: 0,
    moonsLabel: "0",
    tempLabel: "464 °C mean",
    pressure: "92 bar",
    obliquity: 177.4,
    rings: "none",
    summary:
      "A near-twin of Earth in size and mass, wrapped in a carbon-dioxide atmosphere about 92 times as heavy as ours. The mean surface temperature is 464 °C. The globe here uses the radar surface under a cloud deck.",
    history: [
      { year: "Antiquity", title: "The morning and evening star", detail: "Venus is the brightest planet. Early observers sometimes treated the morning and evening apparitions as two objects." },
      { year: "1962", title: "Mariner 2", detail: "The first successful planetary flyby. It found a hot surface and no Earth-like magnetosphere." },
      { year: "1970", title: "Venera 7", detail: "The Soviet lander was the first spacecraft to return data from the surface of another planet." },
      { year: "1990", title: "Magellan", detail: "Radar mapped nearly the entire surface through the clouds, from 1990 to 1994." },
    ],
    layers: [
      { name: "Core", radius: 0.5, color: "#d2b48a", note: "Modeled iron core. Venus has no measured global magnetic field." },
      { name: "Mantle", radius: 0.94, color: "#a86448", note: "Rock, probably with a style of convection unlike Earth’s plates." },
      { name: "Crust", radius: 1, color: "#c4a060", note: "Basalt plains, tesserae, and volcanoes. Thickness in the model is exaggerated." },
    ],
    unusual: [
      { title: "It spins backwards", detail: "The sidereal rotation is −5,832.5 hours, and the obliquity is 177.4°. The Sun rises in the west. A solar day is 117 Earth days, shorter than the 225-day year." },
      { title: "A runaway greenhouse", detail: "The atmosphere is mostly CO₂ with sulfuric-acid clouds. Pressure at the surface is about 92 bar, and lead would soften in the heat." },
      { title: "No moons", detail: "Venus has no natural satellite. Any ancient moon is gone, or it never kept one." },
    ],
    formation: [
      "Venus condensed from the same inner-disk rock and metal as Earth.",
      "Planetesimals built a planet about Earth’s mass, close enough to the Sun for a dense CO₂ atmosphere.",
      "Heat and differentiation produced a core, mantle, and a volcanic crust. Oceans, if they ever existed, were lost.",
      "Venus today, under a global cloud deck, with a day longer than its year and a retrograde spin.",
    ],
    sources: [
      { label: "NASA Venus fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html" },
      { label: "NASA Magellan", url: "https://science.nasa.gov/mission/magellan/" },
    ],
  },
  earth: {
    id: "earth",
    name: "Earth",
    kind: "Terrestrial planet",
    diameterKm: 12756,
    massMan: "5.97",
    massExp: 24,
    gravity: "9.8 m/s²",
    density: "5,514 kg/m³",
    dayHours: 24,
    rotationHours: 23.9,
    yearDays: 365.2,
    moons: 1,
    moonsLabel: "1",
    tempLabel: "15 °C mean",
    pressure: "1 bar",
    obliquity: 23.4,
    rings: "none",
    summary:
      "The only world known to host life. Liquid water is stable at the surface, a nitrogen-oxygen atmosphere holds a surface pressure of 1 bar, and a magnetic field turns aside much of the solar wind.",
    history: [
      { year: "4.0 Ga", title: "A crust and oceans", detail: "The oldest minerals and, later, sedimentary rocks record a surface with liquid water within a few hundred million years of formation." },
      { year: "1957", title: "Sputnik 1", detail: "The first artificial satellite. Earth became a planet studied from outside." },
      { year: "1968", title: "Apollo 8", detail: "The first crewed voyage around the Moon returned the Earthrise photograph." },
      { year: "1990s", title: "A continuous climate watch", detail: "Satellite records of ice, oceans, and atmosphere turned Earth itself into a long-running planetary mission." },
    ],
    layers: [
      { name: "Inner core", radius: 0.19, color: "#e6c98a", note: "Solid iron-nickel, about 1,220 km in radius." },
      { name: "Outer core", radius: 0.55, color: "#c4784a", note: "Liquid iron. Its motion sustains the magnetic field. Boundary near 3,480 km." },
      { name: "Mantle", radius: 0.92, color: "#a85a42", note: "Solid rock that creeps over geologic time." },
      { name: "Crust", radius: 1, color: "#6f8a62", note: "A few tens of kilometers. Drawn much thicker than the real shell." },
    ],
    unusual: [
      { title: "Liquid water at the surface", detail: "Mean temperature is 15 °C. Oceans cover most of the planet and have been there for billions of years." },
      { title: "A large moon and active plates", detail: "Earth’s Moon is huge relative to its planet. Plate tectonics recycles the crust and helps regulate carbon dioxide." },
      { title: "A living atmosphere", detail: "Oxygen at about 21% is a product of photosynthesis. Without life, the air would not look like this." },
    ],
    formation: [
      "Inside the snow line, rock and metal grains collided in the solar nebula.",
      "Embryos merged. One late giant impact threw debris into orbit that became the Moon.",
      "Iron sank into the core, silicates formed the mantle, and a magma ocean cooled into a crust.",
      "Earth today, with oceans, continents, a magnetic field, and one large moon.",
    ],
    sources: [
      { label: "NASA planetary fact sheet", url: FACT },
      { label: "NASA Earth fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html" },
    ],
  },
  moon: {
    id: "moon",
    name: "Moon",
    kind: "Natural satellite",
    diameterKm: 3475,
    massMan: "7.3",
    massExp: 22,
    gravity: "1.6 m/s²",
    density: "3,340 kg/m³",
    dayHours: 708.7,
    rotationHours: 655.7,
    yearDays: 27.3,
    moons: 0,
    moonsLabel: "0",
    tempLabel: "−20 °C mean",
    pressure: "0 bar",
    obliquity: 6.7,
    rings: "none",
    summary:
      "Earth’s only natural satellite. It is tidally locked, so the same face points here. The orbital period in the fact sheet is 27.3 days. On this orrery its distance is enlarged to match the enlarged globes.",
    history: [
      { year: "1959", title: "Luna 2 and Luna 3", detail: "Luna 2 was the first craft to reach another world. Luna 3 photographed the far side." },
      { year: "1969", title: "Apollo 11", detail: "Neil Armstrong and Buzz Aldrin landed in Mare Tranquillitatis on 20 July 1969." },
      { year: "1994", title: "Clementine", detail: "Mapped the surface and returned evidence of ice near the south pole." },
      { year: "2023", title: "Artemis and CLPS", detail: "A new series of uncrewed landers and the Artemis crewed program returned the Moon to an active flight schedule." },
    ],
    layers: [
      { name: "Core", radius: 0.2, color: "#d9c4a0", note: "Small, about 350 km. Part of the outer core may still be molten." },
      { name: "Mantle", radius: 0.93, color: "#8d7a6a", note: "Mostly solid silicate. Moonquakes are deep and shallow." },
      { name: "Crust", radius: 1, color: "#b7b1a8", note: "Highland crust, thicker on the far side. The dark maria are lava on the near side." },
    ],
    unusual: [
      { title: "The same face always points at Earth", detail: "Tidal locking matches the rotation to the orbit. The far side is not dark; it just never faces us. The crust there is thicker and almost free of maria." },
      { title: "Born from a giant impact", detail: "The leading model is that a Mars-sized body struck the young Earth. The Moon accreted from the debris disk. That is why it is depleted in iron relative to Earth." },
      { title: "Ice in permanent shadow", detail: "Some polar craters never see the Sun. Neutron spectrometers and later missions found water ice in those cold traps." },
    ],
    formation: [
      "A giant impact threw a disk of vapor and molten rock around the young Earth.",
      "The disk cooled and clumped. A single moon swept up most of the debris.",
      "A magma ocean froze. Light minerals floated into a crust; the far side ended up thicker.",
      "The Moon today, locked to Earth, with maria on the near side and ice in polar shadow.",
    ],
    sources: [
      { label: "NASA Moon fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html" },
      { label: "NASA planetary fact sheet", url: FACT },
    ],
  },
  mars: {
    id: "mars",
    name: "Mars",
    kind: "Terrestrial planet",
    diameterKm: 6792,
    massMan: "6.42",
    massExp: 23,
    gravity: "3.7 m/s²",
    density: "3,934 kg/m³",
    dayHours: 24.7,
    rotationHours: 24.6,
    yearDays: 687,
    moons: 2,
    moonsLabel: "2",
    tempLabel: "−65 °C mean",
    pressure: "0.01 bar",
    obliquity: 25.2,
    rings: "none",
    summary:
      "A cold desert with a day only a little longer than Earth’s and a year of 687 days. The atmosphere is thin carbon dioxide, about 0.01 bar. Two small moons, Phobos and Deimos, orbit it.",
    history: [
      { year: "1965", title: "Mariner 4", detail: "The first flyby returned cratered close-ups and ended the hope of Earth-like canals." },
      { year: "1976", title: "Viking 1 and 2", detail: "The first successful landings. They searched for metabolism and mapped the surface for years." },
      { year: "2012", title: "Curiosity", detail: "Landed in Gale crater and found habitable ancient lake sediments." },
      { year: "2021", title: "Perseverance and Ingenuity", detail: "Perseverance landed in Jezero on 18 February 2021. Ingenuity made the first powered flight on another planet that April." },
    ],
    layers: [
      { name: "Core", radius: 0.54, color: "#e0b56a", note: "InSight measured a liquid core about 1,830 km in radius." },
      { name: "Mantle", radius: 0.94, color: "#a85b3c", note: "Silicate rock. Mars has no global magnetic field now, but the crust remembers an ancient one." },
      { name: "Crust", radius: 1, color: "#c4784a", note: "Basalt and dust. Real crust is tens of kilometers, thickened here so it shows." },
    ],
    unusual: [
      { title: "Olympus Mons", detail: "The largest volcano in the solar system, about 600 km across and over 20 km high. It could grow that large because Mars has no sliding plates to move the crust off the hotspot." },
      { title: "Valles Marineris", detail: "A canyon system about 4,000 km long and several kilometers deep, a tectonic crack rather than a river channel, though water later modified it." },
      { title: "Two tiny moons", detail: "Phobos and Deimos look like captured or impact-made rubble. Phobos orbits so low it rises in the west and will eventually break up or hit Mars." },
    ],
    formation: [
      "Beyond Earth, the disk was colder. Rock, metal, and some ice built Mars farther from the Sun.",
      "It grew quickly, then mostly stopped. Its mass stayed about a tenth of Earth’s.",
      "The core formed, an early magnetic field switched on and later died, and volcanoes built the Tharsis rise.",
      "Mars today: a thin-aired world with polar caps, global dust, and a canyon that spans a continent.",
    ],
    sources: [
      { label: "NASA Mars fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html" },
      { label: "NASA InSight", url: "https://science.nasa.gov/mission/insight/" },
    ],
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    kind: "Gas giant",
    diameterKm: 142984,
    massMan: "1.898",
    massExp: 27,
    gravity: "23.1 m/s²",
    density: "1,326 kg/m³",
    dayHours: 9.9,
    rotationHours: 9.9,
    yearDays: 4331,
    moons: 115,
    moonsLabel: "115",
    tempLabel: "−110 °C mean",
    pressure: "No solid surface",
    obliquity: 3.1,
    rings: "faint",
    summary:
      "The largest planet, more massive than the rest combined. A day is 9.9 hours and a year is 11.86 Earth years. NASA Space Place lists 115 known moons as of April 2026. The fact-sheet table still says 95.",
    history: [
      { year: "1610", title: "The Galilean moons", detail: "Galileo resolved Io, Europa, Ganymede, and Callisto. Their motion was hard to reconcile with everything orbiting Earth." },
      { year: "1979", title: "Voyager", detail: "The flybys found rings, Io’s volcanoes, and the detailed belts and the Great Red Spot." },
      { year: "1995", title: "Galileo orbiter", detail: "The first craft to orbit Jupiter, and the first to send a probe into the atmosphere. It ended in 2003." },
      { year: "2016", title: "Juno", detail: "Entered polar orbit in July 2016 and is still mapping gravity, the magnetic field, and the poles." },
    ],
    layers: [
      { name: "Dilute core", radius: 0.3, color: "#d7c4a4", note: "Juno found a fuzzy core of rock, ice, and hydrogen mixed outward, not a small hard nugget." },
      { name: "Metallic hydrogen", radius: 0.8, color: "#c48a62", note: "Under megabars, hydrogen conducts like a metal and helps drive the magnetic field." },
      { name: "Molecular envelope", radius: 1, color: "#c9a27a", note: "Hydrogen and helium, topped by ammonia clouds. The bands are weather, not a surface." },
    ],
    unusual: [
      { title: "The Great Red Spot", detail: "A high-pressure storm wider than Earth. Continuous records go back to at least 1831. It has been shrinking for decades. Winds still exceed hundreds of kilometers per hour." },
      { title: "A planet that is almost a star", detail: "Mass is 1.898 × 10²⁷ kg. It radiates more heat than it receives. It is far short of the mass needed to fuse hydrogen." },
      { title: "Faint rings and volcanic Io", detail: "The rings are dusty and dark, fed by small inner moons. Io is the most volcanic body in the solar system, flexed by tides." },
    ],
    formation: [
      "Past the snow line, ice made solid cores grow faster than they could in the inner disk.",
      "A core of several Earth masses began to hold onto hydrogen and helium.",
      "Gas accreted in a runaway. Heavy elements mixed through a dilute interior rather than staying in a compact core.",
      "Jupiter today, still contracting and warm, with belts, a fading red storm, and a large moon system.",
    ],
    sources: [
      { label: "NASA Jupiter fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html" },
      { label: "NASA Space Place moon count", url: MOONS },
    ],
  },
  saturn: {
    id: "saturn",
    name: "Saturn",
    kind: "Gas giant",
    diameterKm: 120536,
    massMan: "5.68",
    massExp: 26,
    gravity: "9.0 m/s²",
    density: "687 kg/m³",
    dayHours: 10.7,
    rotationHours: 10.7,
    yearDays: 10747,
    moons: 293,
    moonsLabel: "293",
    tempLabel: "−140 °C mean",
    pressure: "No solid surface",
    obliquity: 26.7,
    rings: "saturn",
    summary:
      "The least dense giant. At 687 kg/m³ it would float if you had an ocean large enough. The rings are water ice. NASA listed 293 confirmed moons by mid-2026; the fact-sheet table still says 274.",
    history: [
      { year: "1610", title: "Galileo’s “ears”", detail: "His telescope showed Saturn as a triple object. He could not resolve a ring." },
      { year: "1655", title: "Huygens", detail: "Christiaan Huygens described a thin ring and discovered Titan." },
      { year: "2004", title: "Cassini", detail: "NASA and ESA orbited Saturn until 15 September 2017, when Cassini burned up in the atmosphere." },
      { year: "2005", title: "Huygens on Titan", detail: "The ESA probe landed on Titan on 14 January 2005, the first landing in the outer solar system." },
    ],
    layers: [
      { name: "Core region", radius: 0.28, color: "#e0d0b0", note: "Rock and ice mixed with gas. The boundary is not sharp." },
      { name: "Metallic hydrogen", radius: 0.6, color: "#d2b48a", note: "A thinner metallic layer than Jupiter’s, which fits the smaller magnetic field." },
      { name: "Molecular envelope", radius: 1, color: "#e6d3a1", note: "Mostly hydrogen and helium. Clouds of ammonia sit at the top. Density of the planet is 687 kg/m³." },
    ],
    unusual: [
      { title: "Rings, not a solid band", detail: "The main rings span from about 7,000 km to 80,000 km above the clouds but are only tens of meters thick. They are almost pure water ice, shepherded by small moons." },
      { title: "Lighter than water", detail: "Mean density is 687 kg/m³, the only planet under 1,000. Gravity at the cloud tops is 9.0 m/s², close to Earth’s, because the mass is spread out." },
      { title: "A hexagon at the north pole", detail: "A six-sided jet stream, about as wide as two Earths, has been stable since Voyager saw it. Titan, larger than Mercury, has a nitrogen atmosphere and methane lakes." },
    ],
    formation: [
      "A second gas giant grew beyond Jupiter, where the disk was colder and thinner.",
      "A heavy core captured hydrogen and helium more slowly than Jupiter did.",
      "The envelope differentiated into metallic and molecular hydrogen. Icy material later fed the rings, probably from a disrupted moon or comet.",
      "Saturn today, tipped 26.7°, with a ring system that is young on the scale of the solar system.",
    ],
    sources: [
      { label: "NASA Saturn fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html" },
      { label: "NASA Saturn moons", url: "https://science.nasa.gov/saturn/moons/" },
    ],
  },
  uranus: {
    id: "uranus",
    name: "Uranus",
    kind: "Ice giant",
    diameterKm: 51118,
    massMan: "8.68",
    massExp: 25,
    gravity: "8.7 m/s²",
    density: "1,270 kg/m³",
    dayHours: 17.2,
    rotationHours: -17.2,
    yearDays: 30589,
    moons: 29,
    moonsLabel: "29",
    tempLabel: "−195 °C mean",
    pressure: "No solid surface",
    obliquity: 97.8,
    rings: "uranus",
    summary:
      "An ice giant tipped 97.8° onto its side, so it rolls around the Sun. A day is 17.2 hours and a year is about 84 Earth years. Space Place lists 29 known moons; the fact-sheet table says 28. The rings are dark and narrow.",
    history: [
      { year: "1781", title: "William Herschel", detail: "On 13 March 1781 Herschel found Uranus with a telescope. It was the first planet discovered in recorded history." },
      { year: "1977", title: "Rings by occultation", detail: "The rings were found when the planet passed in front of a star and the star blinked." },
      { year: "1986", title: "Voyager 2", detail: "The only spacecraft to visit. It flew by on 24 January 1986 and saw a nearly featureless atmosphere and a sideways magnetic field." },
    ],
    layers: [
      { name: "Rocky core", radius: 0.2, color: "#d9d0c4", note: "A small rock-rich center in interior models. Poorly constrained." },
      { name: "Ice mantle", radius: 0.8, color: "#8aa0b5", note: "Hot, dense water, ammonia, and methane. “Ice” here means composition, not temperature." },
      { name: "H/He atmosphere", radius: 1, color: "#c5d5e0", note: "A hydrogen-helium envelope with methane, which absorbs red light and leaves the planet blue-green." },
    ],
    unusual: [
      { title: "It rolls on its side", detail: "Obliquity is 97.8°. Each pole spends about 42 years in sunlight and 42 in darkness. The rings and moons share that tilt." },
      { title: "Almost no leftover heat", detail: "Unlike Neptune, Uranus emits very little internal heat. Voyager saw a bland disk. Later telescopes have caught storms as the seasons changed." },
      { title: "A sideways magnetic field", detail: "The dipole is tilted about 60° from the spin axis and offset from the center, so the magnetosphere tumbles." },
    ],
    formation: [
      "Uranus grew where ices were abundant but hydrogen gas was running out.",
      "A core and a thick ice-rich mantle accreted, then a modest hydrogen envelope.",
      "A giant collision, or several, likely knocked the spin axis over. The interior differentiated into rock, ice, and gas.",
      "Uranus today, pale and sideways, with dark rings and extreme seasons.",
    ],
    sources: [
      { label: "NASA Uranus fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html" },
      { label: "NASA Space Place moon count", url: MOONS },
    ],
  },
  neptune: {
    id: "neptune",
    name: "Neptune",
    kind: "Ice giant",
    diameterKm: 49528,
    massMan: "1.02",
    massExp: 26,
    gravity: "11.0 m/s²",
    density: "1,638 kg/m³",
    dayHours: 16.1,
    rotationHours: 16.1,
    yearDays: 59800,
    moons: 16,
    moonsLabel: "16",
    tempLabel: "−200 °C mean",
    pressure: "No solid surface",
    obliquity: 28.3,
    rings: "faint",
    summary:
      "The outermost major planet. A year is about 165 Earth years. It is denser and windier than Uranus, and it still leaks internal heat. Triton, the largest moon, orbits backwards.",
    history: [
      { year: "1846", title: "Found with mathematics", detail: "Urbain Le Verrier predicted a position from Uranus’s wander. Johann Galle and Heinrich d’Arrest found Neptune at the Berlin Observatory on 23 September 1846. John Couch Adams had made a similar prediction." },
      { year: "1989", title: "Voyager 2", detail: "The only visit, on 25 August 1989. It saw the Great Dark Spot, fast winds, rings, and active geysers on Triton." },
      { year: "2011", title: "A year, completed", detail: "On 11 July 2011 Neptune finished one orbit since its discovery." },
    ],
    layers: [
      { name: "Rocky core", radius: 0.25, color: "#d2cdc4", note: "Models put a rock-rich center inside a much larger ice mantle." },
      { name: "Ice mantle", radius: 0.85, color: "#6f8ea8", note: "Water, ammonia, and methane under high pressure. The source of the extra heat Neptune radiates." },
      { name: "Atmosphere", radius: 1, color: "#4d6fbf", note: "Hydrogen, helium, and more methane than Uranus, which makes Neptune a deeper blue." },
    ],
    unusual: [
      { title: "The fastest winds", detail: "Voyager measured cloud features moving faster than 2,000 km/h relative to the interior rotation. The Great Dark Spot it saw in 1989 later vanished. These storms are transient." },
      { title: "Triton orbits the wrong way", detail: "Triton is inclined and retrograde, so it was probably captured from the Kuiper belt. It has nitrogen geysers and a thin atmosphere. The orbit is decaying." },
      { title: "Warmer inside than it should be", detail: "Neptune emits more than twice the energy it absorbs from the Sun. Uranus, similar in size, does not. The difference is still unexplained." },
    ],
    formation: [
      "Neptune’s building blocks formed in a colder, icier part of the disk, possibly closer to the Sun than it orbits now.",
      "A core accreted ices and some gas. Models of the early solar system move Neptune outward.",
      "The interior settled into rock, an ice mantle, and a hydrogen envelope. Triton was captured later and destroyed or ejected other moons.",
      "Neptune today, deep blue, still warm inside, with faint rings and one large backward moon.",
    ],
    sources: [
      { label: "NASA Neptune fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html" },
      { label: "NASA Space Place moon count", url: MOONS },
    ],
  },
  pluto: {
    id: "pluto",
    name: "Pluto",
    kind: "Dwarf planet",
    diameterKm: 2376,
    massMan: "1.30",
    massExp: 22,
    gravity: "0.7 m/s²",
    density: "1,850 kg/m³",
    dayHours: 153.3,
    rotationHours: -153.3,
    yearDays: 90560,
    moons: 5,
    moonsLabel: "5",
    tempLabel: "−225 °C mean",
    pressure: "0.00001 bar",
    obliquity: 119.5,
    rings: "none",
    summary:
      "A dwarf planet in the Kuiper belt. The year is 90,560 days, about 248 Earth years, on an orbit inclined 17° that crosses Neptune’s. Five moons are known. Charon is large enough that the pair orbits a point outside Pluto.",
    history: [
      { year: "1930", title: "Clyde Tombaugh", detail: "Discovered on 18 February 1930 at Lowell Observatory, on plates taken the month before." },
      { year: "1978", title: "Charon", detail: "James Christy found Pluto’s large moon as a bump on its images. The pair’s motion gave Pluto’s mass." },
      { year: "2006", title: "Dwarf planet", detail: "The IAU defined “planet” in a way Pluto does not meet: it has not cleared its neighborhood. The category “dwarf planet” was created the same day." },
      { year: "2015", title: "New Horizons", detail: "Flew past on 14 July 2015. The map used here is from that encounter, NASA/JHUAPL/SwRI." },
    ],
    layers: [
      { name: "Rocky core", radius: 0.7, color: "#c4b49a", note: "Density 1,850 kg/m³ implies a large rock fraction under the ice." },
      { name: "Water-ice mantle", radius: 0.97, color: "#d5e2ea", note: "A thick shell of water ice. An ocean may sit at its base." },
      { name: "Nitrogen crust", radius: 1, color: "#f2efe6", note: "Nitrogen, methane, and carbon monoxide ices. Sputnik Planitia is a nitrogen glacier." },
    ],
    unusual: [
      { title: "A heart of nitrogen ice", detail: "Tombaugh Regio, the pale heart, is dominated by Sputnik Planitia, a basin full of convecting nitrogen ice. It may have reoriented Pluto so the basin faces Charon." },
      { title: "Locked to Charon", detail: "Pluto and Charon each keep the same face toward the other. Four smaller moons — Styx, Nix, Kerberos, and Hydra — orbit the pair." },
      { title: "An atmosphere that collapses", detail: "Surface pressure is about 10 microbars. As Pluto moves away from the Sun, nitrogen frost takes more of the air back onto the ground." },
    ],
    formation: [
      "Pluto grew in the Kuiper belt from icy and rocky pebbles beyond the giant planets.",
      "It became large enough to pull itself into a sphere. A glancing impact later produced Charon and the small moons.",
      "Rock settled inward, water ice formed a mantle, and volatile ices coated the surface.",
      "Pluto today, half mapped at high resolution, with glaciers, mountains of water ice, and a thin seasonal atmosphere.",
    ],
    sources: [
      { label: "NASA Pluto fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html" },
      { label: "New Horizons Pluto map", url: "https://commons.wikimedia.org/wiki/File:Nh-pluto-map.jpg" },
    ],
  },
};

export const FORMATION_STAGES = ["Dust", "Accretion", "Differentiation", "Today"] as const;
