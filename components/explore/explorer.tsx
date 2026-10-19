"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BODIES, BODY_ORDER, FORMATION_STAGES, type BodyId } from "@/lib/bodies";
import { formatDayHours, formatKm, formatYearDays } from "@/lib/format";
import { INTERIORS } from "@/lib/interiors";
import { MOON_MAPS, minorMoonsOf, moonById, moonsOf, moonStory } from "@/lib/moons";
import { ExplorerProvider } from "@/components/explorer/context";

const WorldStage = dynamic(() => import("@/components/world/world-stage").then((m) => m.WorldStage), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />,
});

type Sel = { body: BodyId; moon: string | null };

function readSel(q: URLSearchParams): Sel {
  const m = moonById(q.get("moon"));
  if (m) return { body: m.parent, moon: m.id };
  const b = q.get("body") as BodyId | null;
  return { body: b && BODY_ORDER.includes(b) ? b : "earth", moon: null };
}

export function Explorer() {
  const params = useSearchParams();
  const [sel, setSel] = useState<Sel>(() => readSel(new URLSearchParams(params.toString())));
  const [mode, setMode] = useState<"surface" | "core">("surface");
  const [open, setOpen] = useState<BodyId>(sel.body);
  const canCore = !sel.moon && Boolean(INTERIORS[sel.body]);

  useEffect(() => {
    const q = sel.moon ? `?moon=${sel.moon}` : `?body=${sel.body}`;
    window.history.replaceState(null, "", `/explore${q}`);
  }, [sel]);

  useEffect(() => {
    // Moons clicked in the 3D view select themselves.
    const onMoon = (e: Event) => {
      const m = moonById((e as CustomEvent<string>).detail);
      if (m) setSel({ body: m.parent, moon: m.id });
    };
    window.addEventListener("anorix-moon", onMoon);
    return () => window.removeEventListener("anorix-moon", onMoon);
  }, []);

  const pickBody = (id: BodyId) => {
    setSel({ body: id, moon: null });
    setOpen(id);
  };
  const pickMoon = (id: string) => {
    const m = moonById(id)!;
    setSel({ body: m.parent, moon: id });
    setMode("surface");
  };
  const view = canCore ? mode : "surface";

  return (
    <ExplorerProvider syncUrl={false}>
      <div className="explore-app relative grid h-dvh grid-rows-[auto_1fr] overflow-hidden bg-black text-[var(--fg-1)]">
        <header className="site-header relative z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-baseline gap-2 no-underline">
            <span className="eyebrow">Anorix</span>
            <span className="wordmark text-[20px] font-light tracking-[-0.04em] text-white">Cosmos</span>
            <span className="eyebrow hidden sm:inline">· Explorer</span>
          </Link>
          <Link href="/" className="g-btn g-btn-soft">
            ← Orrery
          </Link>
        </header>
        <div className="explore-grid min-h-0">
          <nav className="cosmos-panel explore-left no-scrollbar" aria-label="Worlds">
            <p className="eyebrow px-2 pb-3">Worlds</p>
            <ul>
              {BODY_ORDER.map((id) => {
                const moons = id === "earth" ? [] : moonsOf(id);
                const hasMinor = minorMoonsOf(id).length > 0;
                const expanded = open === id && (moons.length > 0 || hasMinor || id === "earth");
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="explore-row"
                      data-on={sel.body === id && !sel.moon}
                      aria-expanded={moons.length || id === "earth" ? expanded : undefined}
                      onClick={() => (sel.body === id && !sel.moon && open === id ? setOpen("sun") : pickBody(id))}
                    >
                      <span>{BODIES[id].name}</span>
                      <span className="explore-meta">{moons.length || id === "earth" ? `${BODIES[id].moonsLabel} ${expanded ? "▾" : "▸"}` : BODIES[id].kind.split(" ")[0]}</span>
                    </button>
                    {expanded ? (
                      <ul className="explore-sub">
                        {id === "earth" ? (
                          <li>
                            <button type="button" className="explore-row explore-moon" onClick={() => pickBody("moon")}>
                              <span>Moon</span>
                              <span className="explore-meta">Rocky</span>
                            </button>
                          </li>
                        ) : null}
                        {moons.map((m) => (
                          <li key={m.id}>
                            <button type="button" className="explore-row explore-moon" data-on={sel.moon === m.id} onClick={() => pickMoon(m.id)}>
                              <span>{m.name}</span>
                              <span className="explore-meta">{m.type}</span>
                            </button>
                          </li>
                        ))}
                        <MinorList parent={id} current={sel.moon} pick={pickMoon} />
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
          <section className="explore-stage relative min-h-0" aria-label="3D model">
            <WorldStage key={`${sel.body}-${sel.moon ?? ""}-${view}`} id={sel.body} mode={view === "core" ? "cutaway" : "surface"} moonId={sel.moon} />
            <div className="pointer-events-none absolute top-5 left-5">
              <p className="eyebrow">{sel.moon ? `${moonById(sel.moon)!.type} · moon of ${BODIES[sel.body].name}` : BODIES[sel.body].kind}</p>
              <h1 className="mt-2 text-[44px] leading-none font-light tracking-[-0.05em] text-white md:text-[64px]">
                {sel.moon ? moonById(sel.moon)!.name : BODIES[sel.body].name}
              </h1>
            </div>
            <div className="seg absolute bottom-5 left-1/2 -translate-x-1/2" role="group" aria-label="Model view">
              <button type="button" aria-pressed={view === "surface"} data-on={view === "surface"} onClick={() => setMode("surface")}>
                Surface
              </button>
              <button
                type="button"
                aria-pressed={view === "core"}
                data-on={view === "core"}
                disabled={!canCore}
                title={canCore ? "Layered cutaway" : "No published interior model for this moon"}
                onClick={() => setMode("core")}
              >
                Core
              </button>
            </div>
          </section>
          <aside className="cosmos-panel explore-right no-scrollbar" aria-label="Details">
            {sel.moon ? <MoonInfo id={sel.moon} pick={pickMoon} /> : <BodyInfo id={sel.body} pick={pickMoon} />}
          </aside>
        </div>
      </div>
    </ExplorerProvider>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] py-5">
      <h2 className="eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[11px] tracking-[0.06em] text-[var(--fg-3)] uppercase">{k}</dt>
          <dd className="mt-0.5 text-[14px] text-[var(--fg-0)]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const AGE: Partial<Record<BodyId, string>> = { sun: "≈4.6 billion years", earth: "≈4.54 billion years" };

function BodyInfo({ id, pick }: { id: BodyId; pick: (m: string) => void }) {
  const b = BODIES[id];
  const interior = INTERIORS[id];
  const moons = moonsOf(id);
  return (
    <div>
      <p className="pb-5 text-[15px] leading-relaxed text-[var(--fg-1)]">{b.summary}</p>
      <Block title="Facts">
        <Facts
          rows={[
            ["Age", AGE[id] ?? "≈4.5 billion years"],
            ["Diameter", formatKm(b.diameterKm)],
            ["Mass", <>{b.massMan} × 10<sup>{b.massExp}</sup> kg</>],
            ["Gravity", b.gravity],
            ["Day", formatDayHours(b.dayHours)],
            ["Year", b.yearDays ? formatYearDays(b.yearDays) : "—"],
            ["Moons (NASA)", b.moonsLabel],
            ["Temperature", b.tempLabel],
          ]}
        />
      </Block>
      <Block title="History · discovery and missions">
        <ol className="ml-1 border-l border-[var(--line)]">
          {b.history.map((h) => (
            <li key={h.year + h.title} className="mb-4 pl-4">
              <p className="font-mono text-[11px] text-[#3b82f6]">{h.year}</p>
              <p className="text-[14px] text-[var(--fg-0)]">{h.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--fg-2)]">{h.detail}</p>
            </li>
          ))}
        </ol>
      </Block>
      <Block title="Formation">
        {b.formation.map((f, i) => (
          <p key={i} className="mb-2 text-[13px] leading-relaxed text-[var(--fg-2)]">
            <span className="font-mono text-[11px] text-[var(--fg-3)]">{FORMATION_STAGES[i]} · </span>
            {f}
          </p>
        ))}
      </Block>
      {interior ? (
        <Block title="Interior (Core view)">
          {interior.layers.map((l, i) => (
            <div key={l.name} className="flex gap-3 py-1.5 text-[13px]">
              <span className="mt-1 inline-block size-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
              <span>
                <span className="text-[var(--fg-0)]">{l.name}</span>
                <span className="text-[var(--fg-3)]"> · {i === 0 ? `0–${Math.round(l.outerKm).toLocaleString("en-US")} km` : `${Math.round(l.outerKm - interior.layers[i - 1].outerKm).toLocaleString("en-US")} km thick`}</span>
                <span className="block text-[var(--fg-2)]">{l.composition} · {l.temp}</span>
              </span>
            </div>
          ))}
        </Block>
      ) : null}
      {moons.length ? (
        <Block title={`Moons · ${b.moonsLabel} known (NASA)`}>
          {moons.map((m) => (
            <button key={m.id} type="button" className="explore-row" onClick={() => pick(m.id)}>
              <span>{m.name}</span>
              <span className="explore-meta">{m.type}</span>
            </button>
          ))}
        </Block>
      ) : null}
      <Block title="Unusual">
        {b.unusual.map((u) => (
          <div key={u.title} className="mb-3">
            <p className="text-[14px] text-[var(--fg-0)]">{u.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--fg-2)]">{u.detail}</p>
          </div>
        ))}
      </Block>
      <Block title="Sources">
        <ul className="source-list list-none p-0 text-[13px]">
          {[...b.sources, ...(interior?.sources ?? [])].map((s) => (
            <li key={s.url + s.label}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
            </li>
          ))}
        </ul>
      </Block>
    </div>
  );
}

function MoonInfo({ id, pick }: { id: string; pick: (m: string) => void }) {
  const m = moonById(id)!;
  const st = moonStory(m);
  const map = MOON_MAPS[m.id];
  return (
    <div>
      <p className="pb-5 text-[15px] leading-relaxed text-[var(--fg-1)]">{m.note}</p>
      <Block title="Facts">
        <Facts
          rows={[
            ["Mean diameter", (m.radiusKm ? formatKm(m.radiusKm * 2) : "Not measured (JPL)")],
            ["Shape", m.axesKm ? `${m.axesKm.map((a) => Math.round(a * 2)).join(" × ")} km` : m.minor ? "Unresolved (too small to image)" : "Round"],
            ["Orbit radius", formatKm(m.aKm)],
            ["Period", `${Math.abs(m.periodDays)} d${m.periodDays < 0 ? " retro" : ""}`],
            ["Discovered", m.discovered],
            ["Age", "≈4.5 billion years"],
          ]}
        />
      </Block>
      <Block title="Origin">
        <p className="text-[13px] leading-relaxed text-[var(--fg-2)]">{st.formation}</p>
      </Block>
      {st.visits.length ? (
        <Block title="Missions">
          <ol className="ml-1 border-l border-[var(--line)]">
            {st.visits.map((v) => (
              <li key={v} className="mb-2 pl-4 text-[13px] text-[var(--fg-1)]">{v}</li>
            ))}
          </ol>
        </Block>
      ) : null}
      <Block title={`Other moons of ${BODIES[m.parent].name}`}>
        {moonsOf(m.parent)
          .filter((s) => s.id !== m.id)
          .map((s) => (
            <button key={s.id} type="button" className="explore-row" onClick={() => pick(s.id)}>
              <span>{s.name}</span>
              <span className="explore-meta">{s.type}</span>
            </button>
          ))}
      </Block>
      <Block title="Sources">
        <ul className="source-list list-none p-0 text-[13px]">
          <li><a href={m.url} target="_blank" rel="noreferrer">NASA Science: {m.name}</a></li>
          <li><a href="https://ssd.jpl.nasa.gov/sats/phys_par/" target="_blank" rel="noreferrer">JPL SSD satellite physical parameters</a></li>
          {map ? <li><a href={map.page} target="_blank" rel="noreferrer">Surface map (credit on the source page)</a></li> : <li className="text-[var(--fg-3)]">Surface is procedural: no global map is published.</li>}
        </ul>
      </Block>
    </div>
  );
}

const ROW = 30;
const ORDER = ["regular", "Inuit (prograde)", "Gallic (prograde)", "irregular-prograde", "Norse (retrograde)", "irregular-retrograde"];
type Item = { kind: "h"; label: string } | { kind: "m"; id: string; name: string; meta: string };

/** Windowed list of every JPL-catalogued small moon, grouped by family. */
function MinorList({ parent, current, pick }: { parent: BodyId; current: string | null; pick: (id: string) => void }) {
  const items = useMemo(() => {
    const all = minorMoonsOf(parent);
    const groups = [...new Set(all.map((m) => m.minor!.group))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    const out: Item[] = [];
    for (const g of groups) {
      const ms = all.filter((m) => m.minor!.group === g).sort((a, b) => a.aKm - b.aKm);
      out.push({ kind: "h", label: `${g.replace("irregular-", "irregular, ")} · ${ms.length}` });
      for (const m of ms) out.push({ kind: "m", id: m.id, name: m.name, meta: m.radiusKm ? `${Math.round(m.radiusKm * 2)} km` : `${m.minor!.i.toFixed(0)}°` });
    }
    return out;
  }, [parent]);
  const [top, setTop] = useState(0);
  if (items.length === 0) return null;
  const h = Math.min(items.length * ROW, 330);
  const first = Math.max(0, Math.floor(top / ROW) - 4);
  const last = Math.min(items.length, first + Math.ceil(h / ROW) + 8);
  return (
    <li>
      <div className="explore-minor-title">All catalogued moons (JPL) · {items.filter((i) => i.kind === "m").length}</div>
      <div className="no-scrollbar explore-minor" style={{ height: h }} onScroll={(e) => setTop(e.currentTarget.scrollTop)} data-testid="minor-list">
        <div style={{ height: items.length * ROW, position: "relative" }}>
          {items.slice(first, last).map((it, k) => {
            const y = (first + k) * ROW;
            return it.kind === "h" ? (
              <div key={`h${y}`} className="explore-minor-h" style={{ top: y }}>{it.label}</div>
            ) : (
              <button key={it.id} type="button" className="explore-row explore-moon explore-minor-row" style={{ top: y }} data-on={current === it.id} onClick={() => pick(it.id)}>
                <span>{it.name}</span>
                <span className="explore-meta">{it.meta}</span>
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}
