/** Julian Date helpers. J2000.0 is JD 2451545.0 (2000 Jan 1, 12:00 TT). */
export const J2000 = 2451545.0;

export function unixToJd(ms: number): number {
  return ms / 86_400_000 + 2_440_587.5;
}

export function jdToUnix(jd: number): number {
  return (jd - 2_440_587.5) * 86_400_000;
}

/** Positions come from astronomy-engine, accurate across this whole window. */
export const SIM_MIN = Date.UTC(1700, 0, 1);
export const SIM_MAX = Date.UTC(2200, 0, 1);

export function formatSimDate(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

export function clampSim(ms: number): number {
  return Math.min(SIM_MAX, Math.max(SIM_MIN, ms));
}
