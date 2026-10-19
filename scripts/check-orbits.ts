import { unixToJd } from "../lib/julian";
import { eclipticLongitudeDeg, planetEcliptic } from "../lib/kepler";

const jd = unixToJd(Date.UTC(2026, 9, 12));
const ids = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

for (const id of ids) {
  const p = planetEcliptic(id, jd);
  const lon = eclipticLongitudeDeg(p);
  process.stdout.write(
    `${id.padEnd(10)} r=${p.r.toFixed(4)} AU  lon=${lon.toFixed(1)}°\n`,
  );
}

const earth = planetEcliptic("earth", jd);
const lon = eclipticLongitudeDeg(earth);
if (earth.r < 0.95 || earth.r > 1.05) {
  throw new Error(`Earth distance out of range: ${earth.r}`);
}
if (lon < 5 || lon > 40) {
  throw new Error(`Earth longitude on 2026-10-12 expected near 20°, got ${lon}`);
}
process.stdout.write("orbit check ok\n");
