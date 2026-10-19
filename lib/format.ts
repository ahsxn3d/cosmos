export function formatDayHours(hours: number): string {
  const abs = Math.abs(hours);
  if (abs < 48) {
    return `${abs.toLocaleString("en-US", { maximumFractionDigits: 1 })} hours`;
  }
  const days = abs / 24;
  return `${days.toLocaleString("en-US", { maximumFractionDigits: 1 })} Earth days`;
}

export function formatYearDays(days: number): string {
  if (days < 500) {
    return `${days.toLocaleString("en-US", { maximumFractionDigits: 1 })} days`;
  }
  const years = days / 365.25;
  return `${years.toLocaleString("en-US", { maximumFractionDigits: 2 })} Earth years`;
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

export function formatAu(au: number): string {
  if (au < 0.01) return `${au.toFixed(5)} AU`;
  if (au < 10) return `${au.toFixed(3)} AU`;
  return `${au.toFixed(2)} AU`;
}

const KM_PER_AU = 149_597_870.7;

export function formatDistance(au: number, fromEarth = false): string {
  if (fromEarth) {
    const km = au * KM_PER_AU;
    return `${Math.round(km).toLocaleString("en-US")} km from Earth`;
  }
  const million = (au * KM_PER_AU) / 1_000_000;
  return `${formatAu(au)} · ${million.toLocaleString("en-US", { maximumFractionDigits: 1 })} million km`;
}
