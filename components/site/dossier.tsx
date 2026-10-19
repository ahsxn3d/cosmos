"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BODIES, BODY_ORDER, FORMATION_STAGES, type BodyId } from "@/lib/bodies";
import { formatAu, formatDayHours, formatDistance, formatKm, formatYearDays } from "@/lib/format";
import { formatSimDate, unixToJd } from "@/lib/julian";
import { heliocentricLongitude, solarDistanceAu } from "@/lib/positions";
import { useExplorer } from "@/components/explorer/context";
import { INTERIORS } from "@/lib/interiors";
import { live } from "@/lib/live";
import { MOON_MAPS, MOON_SOURCES, MOONS, moonById, moonsOf, moonStory } from "@/lib/moons";
import { MISSIONS, missionById } from "@/lib/missions";
import { UOBJS } from "@/lib/universe";
import { missionSunDistance } from "@/components/explorer/missions";

const BEYOND_COPY = {
  universe: {
    kicker: "Powers of ten",
    title: "Universe",
    lede: "Zoom from the planets to the edge of the observable universe. At every step the view is true linear scale: Oort Cloud, the nearest stars from the HYG catalog, the Milky Way with the Sun marked, the Local Group, and the cosmic web.",
    points: [
      "Star positions and colors come from the HYG v4.1 catalog (Hipparcos, Yale, Gliese): every star within 30 light-years plus the brightest out to a few thousand.",
      "The Milky Way is oriented by the real galactic pole and center, 26,000 light-years away. Its face-on disk is a model based on the NASA/JPL-Caltech (SSC) illustration built from Spitzer data. Andromeda, Triangulum and the Magellanic Clouds are real photographs at their real directions and distances. Catalogued nebulae and clusters (M42, Carina, M16, M1, Helix, M57, M45, Omega Centauri) are real images at their SIMBAD positions and NASA/ESO distances; small ones are enlarged to stay visible.",
      "The cosmic web is 43,463 real galaxies from the 2MASS Redshift Survey, out to ~2.4 billion ly. The 46.5-billion-light-year horizon is real. The Hubble Ultra Deep Field is shown at its real sky direction.",
    ],
    source: { label: "HYG star database", url: "https://github.com/astronexus/HYG-Database" },
  },
  milkyway: {
    kicker: "Galaxy",
    title: "The Milky Way",
    lede: "A barred spiral about 100,000 light-years across. The Sun sits in a minor arm, roughly 26,000 light-years from the center.",
    points: [
      "The blue marker is the Sun, a little over halfway out from the bulge. The disk in this view is a model based on the NASA/JPL-Caltech (SSC) illustration, not a photograph.",
      "Sagittarius A*, the central black hole, holds about 4 million solar masses. The Event Horizon Telescope published its shadow in 2022.",
      "Most of the Galaxy’s mass is dark matter. The stars you see are the luminous fraction.",
    ],
    source: { label: "NASA: the Milky Way", url: "https://science.nasa.gov/universe/galaxies/" },
  },
  proxima: {
    kicker: "Nearest star",
    title: "Proxima Centauri",
    lede: "A red dwarf 4.24 light-years away in Centaurus, spectral type M5.5. It is the closest star to the Sun and a distant member of the Alpha Centauri system.",
    points: [
      "Mass is about 0.12 solar masses and the radius about 0.15 solar radii. It flares.",
      "Proxima b, found in 2016, orbits in 11.2 days. Its minimum mass is a little over one Earth mass. It receives a similar amount of energy to Earth and is probably tidally locked.",
      "Proxima d, announced in 2022, is smaller and closer in, on a five-day orbit. A third signal, Proxima c, is less secure.",
    ],
    source: { label: "NASA Exoplanet Catalog: Proxima Centauri b", url: "https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/" },
  },
  sagittarius: {
    kicker: "Black hole",
    title: "Sagittarius A*",
    lede: "The compact radio source at the Galactic center. Stars orbit it so fast that the mass inside their paths is about 4 million suns, in a volume smaller than Mercury’s orbit.",
    points: [
      "The dark sphere is the shadow. The thin ring stands in for the photon ring. The disk is a simple shader: hotter and brighter on the approaching side, the way a real accretion flow is Doppler boosted.",
      "The Event Horizon Telescope assembled the first image of that shadow from observations in April 2017, released in May 2022.",
      "Nothing here is a simulation of the magnetized plasma. It is a diagram you can orbit.",
    ],
    source: { label: "NASA: Sagittarius A*", url: "https://science.nasa.gov/universe/black-holes/" },
  },
} as const;

type PanelView = "worlds" | "beyond" | "sources" | "missions" | "compare";

/** NASA: the solar system formed ~4.6 billion years ago; the planets ~4.5 billion. */
const AGE: Record<BodyId, string> = {
  sun: "≈4.6 billion yr",
  mercury: "≈4.5 billion yr",
  venus: "≈4.5 billion yr",
  earth: "≈4.54 billion yr",
  moon: "≈4.5 billion yr",
  mars: "≈4.5 billion yr",
  jupiter: "≈4.5 billion yr",
  saturn: "≈4.5 billion yr",
  uranus: "≈4.5 billion yr",
  neptune: "≈4.5 billion yr",
  pluto: "≈4.5 billion yr",
};

export function Dossier() {
  const explorer = useExplorer();
  const { selected, scene, beyond } = explorer;
  const [panel, setPanel] = useState<{ view: PanelView; at: BodyId | null }>({ view: "worlds", at: null });
  const view: PanelView = selected && panel.at !== selected ? "worlds" : panel.view;
  const NAV: [PanelView, string][] = [
    ["worlds", "Worlds"],
    ["missions", "Missions"],
    ["compare", "Compare"],
    ["beyond", "Beyond"],
    ["sources", "Sources"],
  ];
  const setView = (next: PanelView) => setPanel({ view: next, at: selected });
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPanel = (event: Event) => setPanel({ view: (event as CustomEvent<PanelView>).detail, at: live.selected });
    window.addEventListener("anorix-panel", onPanel);
    return () => window.removeEventListener("anorix-panel", onPanel);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selected, explorer.tab, explorer.moon, view]);

  const body = selected ? BODIES[selected] : null;
  const showBeyond = view === "beyond" || (scene === "beyond" && !selected);
  const activeMission = missionById(explorer.mission);
  const eyebrow =
    view === "sources" ? "References" : view === "missions" ? "Spacecraft" : view === "compare" ? "Side by side" : showBeyond ? "Beyond" : body ? body.kind : "Solar system";
  const title =
    view === "sources"
      ? "Sources"
      : view === "missions"
        ? (activeMission?.name ?? "Missions")
        : view === "compare"
          ? "Compare"
          : showBeyond
            ? BEYOND_COPY[beyond].title
            : body
              ? body.name
              : "Worlds";

  return (
    <aside
      id="dossier"
      className="cosmos-panel absolute inset-x-0 bottom-0 z-20 flex h-[42dvh] min-h-0 flex-col overflow-hidden bg-[var(--bg)] px-5 pt-6 md:top-20 md:right-5 md:bottom-5 md:left-auto md:h-auto md:w-[360px] md:rounded-[28px] md:px-6 md:pt-7"
    >
      <div className="shrink-0 space-y-5 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 truncate text-[32px] leading-none font-light tracking-[-0.045em] text-[var(--fg-0)]">{title}</h2>
          </div>
          <p className="mb-1 shrink-0 font-mono text-[11px] tracking-[0.08em] text-[var(--fg-3)] uppercase">
            {body && view === "worlds" && !showBeyond ? `${body.moonsLabel} moons` : `${BODY_ORDER.length} worlds`}
          </p>
        </div>
        <div className="-mx-1 flex gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&>*]:shrink-0" role="group" aria-label="Panel">
          {NAV.map(([id, label]) => (
            <FilterChip
              key={id}
              active={id === "beyond" ? showBeyond : id === "worlds" ? view === "worlds" && !showBeyond : view === id}
              label={label}
              onClick={() => {
                setView(id);
                if (id === "beyond" && scene !== "beyond") explorer.openBeyond(beyond);
                if (id === "worlds" && scene === "beyond") explorer.backToOrbits();
              }}
            />
          ))}
        </div>
        {view === "worlds" && !showBeyond ? (
          <>
            <SearchBox />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Worlds">
              {BODY_ORDER.map((id) => (
                <FilterChip key={id} active={selected === id} label={BODIES[id].name} onClick={() => explorer.select(id)} />
              ))}
            </div>
          </>
        ) : showBeyond ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Beyond">
            {(Object.keys(BEYOND_COPY) as (keyof typeof BEYOND_COPY)[]).map((id) => (
              <FilterChip
                key={id}
                active={scene === "beyond" && beyond === id}
                label={BEYOND_COPY[id].title.replace("The ", "")}
                onClick={() => {
                  setView("beyond");
                  explorer.openBeyond(id);
                }}
              />
            ))}
          </div>
        ) : null}
        {body && view === "worlds" && !showBeyond ? (
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-4" role="tablist" aria-label={`${body.name} dossier`}>
            {(
              [
                ["overview", "Overview"],
                ["history", "History"],
                ["moons", "Moons"],
                ["anatomy", "Anatomy"],
                ["unusual", "Unusual"],
                ["formation", "Formation"],
              ] as const
            )
              .filter(([tab]) => tab !== "moons" || moonsOf(body.id).length > 0 || body.id === "earth")
              .map(([tab, label]) => (
                <FilterChip key={tab} role="tab" active={explorer.tab === tab} label={label} onClick={() => explorer.setTab(tab)} />
              ))}
          </div>
        ) : null}
      </div>

      <div ref={scroller} className="pin-scroll min-h-0 flex-1 pb-6">
        {view === "sources" ? (
          <SourcesCopy />
        ) : view === "missions" ? (
          <MissionsCopy />
        ) : view === "compare" ? (
          <CompareCopy />
        ) : showBeyond ? (
          <BeyondCopy id={beyond} />
        ) : selected ? (
          <BodyCopy id={selected} />
        ) : (
          <Intro />
        )}
      </div>

      <footer className="shrink-0 py-4 text-[12px] text-[var(--fg-3)]">
        <a href="https://anorix.dev" target="_blank" rel="noreferrer" className="text-[var(--fg-1)]">
          anorix.dev
        </a>
        <span> · NASA data, CC BY 4.0 maps</span>
      </footer>
    </aside>
  );
}

function FilterChip({ active, label, onClick, role }: { active: boolean; label: string; onClick: () => void; role?: string }) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : active}
      aria-selected={role ? active : undefined}
      onClick={onClick}
      className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors duration-150 ${
        active ? "bg-[var(--pill)] text-[var(--pill-ink)]" : "text-[var(--fg-3)] hover:text-[var(--fg-1)]"
      }`}
    >
      {label}
    </button>
  );
}

function Intro() {
  return (
    <div>
      <p className="text-[14px] leading-relaxed text-[var(--fg-1)]">
        Every planet, the Moon and six spacecraft at their true positions for the date on the clock. Pick any date from 1700 to 2200. Distances are true; switch to True scale to see sizes on the same scale.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--fg-3)]">
        Drag to orbit, scroll to zoom, click any world or moon. Space pauses everything.
      </p>
    </div>
  );
}

function SourcesCopy() {
  const list = [
    { label: "NSSDCA planetary fact sheets", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/" },
    { label: "NASA Science planet facts (structure, history)", url: "https://science.nasa.gov/solar-system/planets/" },
    { label: "JPL approximate planetary positions", url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html" },
    ...MOON_SOURCES,
    { label: "NASA Space Place moon counts", url: "https://spaceplace.nasa.gov/how-many-moons/en/" },
    { label: "Solar System Scope textures, CC BY 4.0", url: "https://www.solarsystemscope.com/textures/" },
    { label: "New Horizons Pluto map (public domain)", url: "https://commons.wikimedia.org/wiki/File:Nh-pluto-map.jpg" },
    { label: "astronomy-engine (true planet and Moon positions, MIT)", url: "https://github.com/cosinekitty/astronomy" },
    { label: "JPL Horizons (spacecraft trajectories)", url: "https://ssd.jpl.nasa.gov/horizons/" },
    ...Object.entries(MOON_MAPS).map(([id, m]) => ({ label: `${moonById(id)?.name ?? id} map: ${m.credit}`, url: m.page })),
  ];
  return (
    <div>
      <ul className="source-list list-none p-0 text-[14px]">
        {list.map((item, i) => (
          <li key={`${item.url}-${i}`}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[13px] leading-relaxed text-[var(--fg-3)]">
        Planets and the Moon sit at their true positions for the date (astronomy-engine). Orbit lines are JPL
        mean-element ellipses. {Object.keys(MOON_MAPS).length} moons use real spacecraft maps; the rest are
        procedural, tinted from NASA imagery. Moon phases around their planets are illustrative, with true order and
        periods. Juno, JWST and Parker distances near their parent body are compressed in readable scale.
      </p>
    </div>
  );
}

function UObjCard() {
  const { uObj } = useExplorer();
  const o = UOBJS.find((x) => x.id === uObj);
  if (!o) return <p className="mb-4 text-[13px] text-[var(--fg-3)]">Click a label in the view to see its facts.</p>;
  return (
    <div className="mb-5 rounded-[18px] bg-[var(--bg-2,#111)] p-4">
      <p className="eyebrow">{o.kind}</p>
      <h3 className="mt-2 text-[22px] font-light tracking-[-0.03em] text-[var(--fg-0)]">{o.name}</h3>
      {o.facts.map((f) => (
        <p key={f} className="mt-2 text-[13px] leading-relaxed text-[var(--fg-2)]">{f}</p>
      ))}
      <p className="mt-2 text-[13px]"><a href={o.source.url} target="_blank" rel="noreferrer" className="text-[var(--fg-1)]">{o.source.label}</a></p>
    </div>
  );
}

function BeyondCopy({ id }: { id: keyof typeof BEYOND_COPY }) {
  const copy = BEYOND_COPY[id];
  return (
    <div>
      {id === "universe" ? <UObjCard /> : null}
      <p className="text-[14px] leading-relaxed text-[var(--fg-1)]">{copy.lede}</p>
      {copy.points.map((point) => (
        <p key={point} className="mt-4 border-t border-[var(--line)] pt-4 text-[14px] leading-relaxed text-[var(--fg-2)]">
          {point}
        </p>
      ))}
      <p className="mt-5 text-[13px]">
        <a href={copy.source.url} target="_blank" rel="noreferrer" className="text-[var(--fg-1)]">
          {copy.source.label}
        </a>
      </p>
    </div>
  );
}

function BodyCopy({ id }: { id: BodyId }) {
  const explorer = useExplorer();
  const body = BODIES[id];
  const jd = unixToJd(explorer.displayMs);
  const distance = solarDistanceAu(id, jd);
  const longitude = heliocentricLongitude(id, jd);
  const stage = Math.min(3, Math.floor(explorer.formation * 4));
  const interior = INTERIORS[id];
  const moons = moonsOf(id);
  const focusMoon = moonById(explorer.moon);

  return (
    <div>
      {explorer.tab === "overview" ? (
        <>
          <p className="text-[14px] leading-relaxed text-[var(--fg-1)]">{body.summary}</p>
          <a href={`/explore?body=${id}`} className="explore-cta explore-cta-lg mt-3">
            Explore {body.name} in Explorer →
          </a>
          <dl className="fact-grid">
            <Fact term="Age" value={AGE[id]} />
            <Fact term="Diameter" value={formatKm(body.diameterKm)} />
            <Fact
              term="Mass"
              value={
                <>
                  {body.massMan} × 10<sup>{body.massExp}</sup> kg
                </>
              }
            />
            <Fact term="Day" value={formatDayHours(body.dayHours)} />
            <Fact term="Year" value={body.yearDays ? formatYearDays(body.yearDays) : "—"} />
            <Fact term="Moons" value={body.moonsLabel} />
            <Fact term="Temperature" value={body.tempLabel} />
            <Fact term="Gravity" value={body.gravity} />
            <Fact term="Density" value={body.density} />
            <Fact term="Obliquity" value={`${body.obliquity}°`} />
            <Fact term="Pressure" value={body.pressure} />
            <Fact term={id === "moon" ? "Distance" : "From the Sun"} value={distance === null ? "—" : formatDistance(distance, id === "moon")} />
            <Fact term="Ecliptic longitude" value={longitude === null ? "—" : `${longitude.toFixed(1)}°`} />
          </dl>
          <p className="mt-4 text-[13px] text-[var(--fg-3)]">
            Clock reads {formatSimDate(explorer.displayMs)}.
            {id !== "sun" && distance !== null && id !== "moon" ? ` Heliocentric distance ${formatAu(distance)}.` : ""}
          </p>
          <ul className="source-list mt-4 list-none p-0 text-[13px]">
            {body.sources.map((source, i) => (
              <li key={`${source.url}-${i}`}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {explorer.tab === "history" ? (
        <div className="timeline">
          {body.history.map((event) => (
            <article key={event.year + event.title}>
              <p className="coord">{event.year}</p>
              <h3 className="mt-1 text-[15px] font-medium tracking-[-0.02em] text-[var(--fg-0)]">{event.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--fg-2)]">{event.detail}</p>
            </article>
          ))}
        </div>
      ) : null}

      {explorer.tab === "moons" ? (
        <div>
          <p className="text-[14px] leading-relaxed text-[var(--fg-1)]">
            {body.name} has {body.moonsLabel} known moon{body.moonsLabel === "1" ? "" : "s"} (NASA). The major ones orbit in
            the view; click one there or here.
          </p>
          {focusMoon ? (
            <article className="mt-4 rounded-2xl bg-[var(--row)] px-4 py-4">
              <p className="coord">{focusMoon.type}</p>
              <h3 className="mt-2 text-[28px] leading-none font-light tracking-[-0.045em] text-[var(--fg-0)]">{focusMoon.name}</h3>
              <dl className="fact-grid">
                <Fact term="Diameter" value={(focusMoon.radiusKm ? formatKm(focusMoon.radiusKm * 2) : "Not measured (JPL)")} />
                <Fact term="Orbit" value={formatKm(focusMoon.aKm)} />
                <Fact term="Period" value={`${Math.abs(focusMoon.periodDays).toLocaleString("en-US")} d${focusMoon.periodDays < 0 ? " retro" : ""}`} />
                <Fact term="Found" value={focusMoon.discovered} />
              </dl>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--fg-2)]">{focusMoon.note}</p>
              {focusMoon.axesKm ? (
                <p className="mt-2 text-[12px] text-[var(--fg-3)]">
                  Shape {focusMoon.axesKm.map((a) => Math.round(a * 2)).join(" × ")} km
                </p>
              ) : null}
              <p className="mt-3 text-[12px] tracking-[0.08em] text-[var(--fg-3)] uppercase">Origin</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-2)]">{moonStory(focusMoon).formation}</p>
              {moonStory(focusMoon).visits.length ? (
                <>
                  <p className="mt-3 text-[12px] tracking-[0.08em] text-[var(--fg-3)] uppercase">Visited by</p>
                  <ul className="mt-1 list-disc pl-4 text-[13px] text-[var(--fg-2)]">
                    {moonStory(focusMoon).visits.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="mt-3 text-[13px]">
                <a href={`/explore?moon=${focusMoon.id}`} className="text-[var(--fg-0)]">
                  Explore {focusMoon.name} deep dive →
                </a>
              </p>
              <p className="mt-3 text-[13px]">
                <a href={focusMoon.url} target="_blank" rel="noreferrer" className="text-[var(--fg-1)]">
                  NASA: {focusMoon.name}
                </a>
              </p>
            </article>
          ) : null}
          <ul className="mt-3">
            {id === "earth" ? (
              <li>
                <button type="button" onClick={() => explorer.select("moon")} className="row-hover flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left">
                  <span>
                    <span className="block text-[14px] text-[var(--fg-1)]">Moon</span>
                    <span className="mt-0.5 block text-[13px] text-[var(--fg-3)]">Rocky · giant-impact origin</span>
                  </span>
                  <span className="font-mono text-[12px] text-[var(--fg-3)]">3,475 km</span>
                </button>
              </li>
            ) : null}
            {moons.map((moon) => (
              <li key={moon.id}>
                <button
                  type="button"
                  onClick={() => explorer.selectMoon(moon.id)}
                  className={`row-hover flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left ${explorer.moon === moon.id ? "bg-[var(--row)]" : ""}`}
                >
                  <span>
                    <span className="block text-[14px] text-[var(--fg-1)]">{moon.name}</span>
                    <span className="mt-0.5 block text-[13px] text-[var(--fg-3)]">
                      {moon.type} · {moon.discovered}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-[var(--fg-3)]">{formatKm(moon.radiusKm * 2)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {explorer.tab === "anatomy" ? (
        <div>
          <p className="text-[14px] leading-relaxed text-[var(--fg-1)]">
            Cutaway drawn to true radial scale. Shells thinner than about 2% of the radius are widened so they show.
          </p>
          <ul className="mt-4">
            {interior.layers.map((layer, index) => {
              const inner = index === 0 ? 0 : interior.layers[index - 1].outerKm;
              return (
                <li key={layer.name} className="border-t border-[var(--line)] py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-[14px] text-[var(--fg-0)]">
                      <span className="size-2 rounded-full" style={{ background: layer.color }} aria-hidden />
                      {layer.name}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--fg-3)]">
                      {formatKm(Math.round(layer.outerKm - inner))}
                      {layer.thin ? " · widened" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-2)]">{layer.composition}</p>
                  <p className="coord mt-1">{layer.temp}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--fg-3)]">{interior.caveat}</p>
          <ul className="source-list mt-3 list-none p-0 text-[13px]">
            {interior.sources.map((source, i) => (
              <li key={`${source.url}-${i}`}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {explorer.tab === "unusual" ? (
        <div>
          {body.unusual.map((feature) => (
            <article key={feature.title} className="border-t border-[var(--line)] py-3 first:border-t-0 first:pt-0">
              <h3 className="text-[15px] font-medium text-[var(--fg-0)]">{feature.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--fg-2)]">{feature.detail}</p>
            </article>
          ))}
        </div>
      ) : null}

      {explorer.tab === "formation" ? (
        <div>
          <p className="eyebrow">{FORMATION_STAGES[stage]}</p>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--fg-1)]">{body.formation[stage]}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {FORMATION_STAGES.map((name, index) => (
              <FilterChip key={name} active={stage === index} label={name} onClick={() => explorer.setFormation((index + 0.15) / 4)} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Fact({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SearchBox() {
  const explorer = useExplorer();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const items = [
    ...BODY_ORDER.map((id) => ({ key: id, label: BODIES[id].name, kind: BODIES[id].kind, go: () => explorer.select(id) })),
    ...MOONS.map((m) => ({ key: m.id, label: m.name, kind: `Moon of ${BODIES[m.parent].name}`, go: () => explorer.selectMoon(m.id) })),
    ...MISSIONS.map((m) => ({ key: m.id, label: m.name, kind: "Spacecraft", go: () => explorer.selectMission(m.id) })),
  ];
  const term = q.trim().toLowerCase();
  const hits = term
    ? items
        .filter((i) => i.label.toLowerCase().includes(term) || i.kind.toLowerCase().includes(term))
        .sort((a, b) => Number(!a.label.toLowerCase().startsWith(term)) - Number(!b.label.toLowerCase().startsWith(term)))
        .slice(0, 6)
    : [];
  const pick = (i: number) => {
    const hit = hits[i];
    if (!hit) return;
    hit.go();
    setQ("");
  };
  return (
    <div>
      <input
        className="cosmos-search"
        type="search"
        aria-label="Search worlds, moons and spacecraft"
        placeholder="Search planets, 27 moons, spacecraft"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
          if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          if (e.key === "Enter") pick(active);
          if (e.key === "Escape") setQ("");
          e.stopPropagation();
        }}
      />
      {hits.length ? (
        <ul className="search-results" role="listbox">
          {hits.map((h, i) => (
            <li key={h.key}>
              <button type="button" data-result data-active={i === active} onClick={() => pick(i)}>
                <span>{h.label}</span>
                <span>{h.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : term ? (
        <p className="mt-2 text-[12px] text-[var(--fg-3)]">No match in the planets, major moons or missions.</p>
      ) : null}
    </div>
  );
}

function MissionsCopy() {
  const explorer = useExplorer();
  const jd = unixToJd(explorer.displayMs);
  const [dist, setDist] = useState<Record<string, number | null>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(MISSIONS.map((m) => missionSunDistance(m.id, jd).then((d) => [m.id, d] as const))).then((rows) => {
      if (alive) setDist(Object.fromEntries(rows));
    });
    return () => {
      alive = false;
    };
  }, [jd]);
  return (
    <div>
      <p className="text-[14px] leading-relaxed text-[var(--fg-1)]">
        Real trajectories from JPL Horizons. Scrub the clock to watch the Voyagers leave, New Horizons reach Pluto, and
        Parker dive at the Sun. Click a craft to follow it.
      </p>
      {MISSIONS.map((m) => {
        const on = explorer.mission === m.id;
        const d = dist[m.id];
        return (
          <div key={m.id} className="mt-4 border-t border-[var(--line)] pt-4">
            <button type="button" className="flex w-full items-baseline justify-between gap-2 text-left" onClick={() => explorer.selectMission(m.id)}>
              <span className={`text-[16px] ${on ? "text-[var(--fg-0)]" : "text-[var(--fg-1)]"}`}>{m.name}</span>
              <span className="font-mono text-[11px] text-[var(--fg-3)]">{d != null ? formatAu(d) : m.id === "jwst" ? "Sun–Earth L2" : "no data on this date"}</span>
            </button>
            <p className="mt-1 text-[12px] text-[var(--fg-3)]">
              Launched {m.launched} · {m.status}
            </p>
            {on
              ? m.facts.map((f) => (
                  <p key={f} className="mt-2 text-[13px] leading-relaxed text-[var(--fg-2)]">
                    {f}
                  </p>
                ))
              : null}
            {on ? (
              <p className="mt-2 text-[13px]">
                <a href={m.url} target="_blank" rel="noreferrer" className="text-[var(--fg-1)]">
                  NASA mission page
                </a>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CompareCopy() {
  const explorer = useExplorer();
  const [a, setA] = useState<BodyId>(explorer.selected ?? "earth");
  const [b, setB] = useState<BodyId>(explorer.selected === "mars" ? "earth" : "mars");
  const jd = unixToJd(explorer.displayMs);
  const rows: [string, (id: BodyId) => ReactNode][] = [
    ["Kind", (id) => BODIES[id].kind],
    ["Diameter", (id) => formatKm(BODIES[id].diameterKm)],
    ["Size vs Earth", (id) => `${(BODIES[id].diameterKm / BODIES.earth.diameterKm).toFixed(2)}×`],
    ["Mass", (id) => (
      <>
        {BODIES[id].massMan} × 10<sup>{BODIES[id].massExp}</sup> kg
      </>
    )],
    ["Gravity", (id) => BODIES[id].gravity],
    ["Density", (id) => BODIES[id].density],
    ["Day", (id) => formatDayHours(BODIES[id].dayHours)],
    ["Year", (id) => (BODIES[id].yearDays ? formatYearDays(BODIES[id].yearDays!) : "—")],
    ["Moons", (id) => BODIES[id].moonsLabel],
    ["Temperature", (id) => BODIES[id].tempLabel],
    ["Pressure", (id) => BODIES[id].pressure],
    ["Obliquity", (id) => `${BODIES[id].obliquity}°`],
    ["From the Sun now", (id) => {
      const d = id === "moon" ? solarDistanceAu("earth", jd) : solarDistanceAu(id, jd);
      return d === null ? "—" : formatAu(d);
    }],
  ];
  const pickA = (id: BodyId) => setA(id);
  const pickB = (id: BodyId) => setB(id);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <select className="cosmos-select" aria-label="First world" value={a} onChange={(e) => pickA(e.target.value as BodyId)}>
          {BODY_ORDER.map((id) => (
            <option key={id} value={id}>
              {BODIES[id].name}
            </option>
          ))}
        </select>
        <select className="cosmos-select" aria-label="Second world" value={b} onChange={(e) => pickB(e.target.value as BodyId)}>
          {BODY_ORDER.map((id) => (
            <option key={id} value={id}>
              {BODIES[id].name}
            </option>
          ))}
        </select>
      </div>
      <SizeBars a={a} b={b} />
      <table className="cmp-table mt-3">
        <thead>
          <tr>
            <th />
            <td className="text-[var(--fg-0)]">{BODIES[a].name}</td>
            <td className="text-[var(--fg-0)]">{BODIES[b].name}</td>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, f]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{f(a)}</td>
              <td>{f(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-[var(--fg-3)]">NSSDCA fact sheet values. Distance from the Sun is for the clock date.</p>
    </div>
  );
}

function SizeBars({ a, b }: { a: BodyId; b: BodyId }) {
  const da = BODIES[a].diameterKm;
  const db = BODIES[b].diameterKm;
  const max = Math.max(da, db);
  const ra = (da / max) * 46;
  const rb = (db / max) * 46;
  return (
    <svg viewBox="0 0 220 104" className="mt-4 w-full" role="img" aria-label="True relative size">
      <circle cx={56} cy={52} r={Math.max(ra, 0.6)} fill="var(--fg-2)" />
      <circle cx={164} cy={52} r={Math.max(rb, 0.6)} fill="var(--fg-1)" />
      <text x={110} y={100} textAnchor="middle" fontSize="8" fill="var(--fg-3)">true relative size</text>
    </svg>
  );
}
