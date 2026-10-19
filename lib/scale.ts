import { BODIES, type BodyId } from "./bodies";
import { live } from "./live";

/** Scene units per astronomical unit. Orbital distances stay linear. */
export const AU_SCENE = 22;

const EARTH_DIAMETER = 12_756;

/**
 * Diameters are enlarged (and the Sun reduced) so Mercury clears the photosphere
 * and Pluto is still a world, not a pixel. Order of size is preserved.
 */
export function visualRadius(id: string): number {
  if (id === "sun") return 4.6;
  const diameter = id in BODIES ? BODIES[id as BodyId].diameterKm : EARTH_DIAMETER;
  const rel = diameter / EARTH_DIAMETER;
  return Math.max(0.2, Math.sqrt(rel) * 0.62);
}

/** Moon's true separation is ~60 Earth radii; sizes are enlarged, so the orbit is too. */
export function moonOrbitScene(): number {
  return visualRadius("earth") * 5.6;
}

export function hitRadius(id: string): number {
  const r = visualRadius(id);
  if (id === "sun") return r * 1.08;
  if (id === "moon") return Math.max(r * 2, 0.75);
  if (r < 0.8) return Math.max(r * 2.4, 1.15);
  return r * 1.35;
}

const AU_KM = 149_597_870.7;
const SUN_DIAMETER = 1_391_400;

/** Radius in scene units if sizes used the same scale as distances. */
export function trueRadius(id: string): number {
  const d = id === "sun" ? SUN_DIAMETER : id in BODIES ? BODIES[id as BodyId].diameterKm : EARTH_DIAMETER;
  return (d / 2 / AU_KM) * AU_SCENE;
}

/** Multiplier applied to a body's drawn size for the current scale mode. */
export function sizeFactor(id: string): number {
  return live.trueScale ? trueRadius(id) / visualRadius(id) : 1;
}

export function displayRadius(id: string): number {
  return visualRadius(id) * sizeFactor(id);
}
