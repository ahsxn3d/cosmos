"use client";

import dynamic from "next/dynamic";
import { BODIES, FORMATION_STAGES } from "@/lib/bodies";
import { minorMoonsOf, moonsOf } from "@/lib/moons";
import { formatSimDate, SIM_MAX, SIM_MIN, unixToJd } from "@/lib/julian";
import { useExplorer, ExplorerProvider } from "@/components/explorer/context";
import { Dossier } from "@/components/site/dossier";
import { useState, useSyncExternalStore } from "react";
import { live } from "@/lib/live";
import { formatSpan, UOBJS } from "@/lib/universe";

const TIERS = [
  { z: 1.8, label: "Planets" },
  { z: 5.0, label: "Oort" },
  { z: 6.4, label: "Stars" },
  { z: 10.0, label: "Galaxy" },
  { z: 12.2, label: "Local Group" },
  { z: 15.4, label: "Universe" },
];

function subZoom(cb: () => void) {
  window.addEventListener("anorix-uzoom", cb);
  return () => window.removeEventListener("anorix-uzoom", cb);
}

function UniverseHud() {
  const explorer = useExplorer();
  const z = useSyncExternalStore(subZoom, () => Math.round(live.uZoom * 100) / 100, () => 1.8);
  const go = (t: number) => {
    live.uTarget = t;
  };
  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-date" aria-live="polite">{formatSpan(Math.pow(10, z) * 2)}</div>
        <button type="button" className="hud-btn ml-auto" onClick={explorer.backToOrbits}>
          Back to orbits
        </button>
      </div>
      <p className="hud-meta mt-2">View width, true linear scale · scroll or pinch to zoom</p>
      <input
        className="time-slider"
        type="range"
        min={120}
        max={1560}
        step={1}
        value={Math.round(z * 100)}
        aria-label="Universe zoom"
        onChange={(event) => {
          live.uTarget = Number(event.target.value) / 100;
          live.uZoom = live.uTarget;
        }}
      />
      <div className="hud-actions">
        {TIERS.map((t) => (
          <button key={t.label} type="button" className="hud-btn" data-on={Math.abs(z - t.z) < 0.9} onClick={() => go(t.z)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
void UOBJS;

const StageCanvas = dynamic(
  () => import("@/components/explorer/canvas-view").then((mod) => mod.StageCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-black" /> },
);

const SPEEDS = [
  { days: 1 / 24, label: "1h" },
  { days: 1, label: "1d" },
  { days: 10, label: "10d" },
  { days: 30, label: "30d" },
  { days: 365, label: "1y" },
];

export function AppShell() {
  return (
    <ExplorerProvider>
      <div className="relative h-dvh overflow-hidden bg-black text-[var(--ink)]">
        <Header />
        <section
          id="system"
          aria-label="Solar system"
          className="absolute inset-x-0 top-0 bottom-[42dvh] md:bottom-0"
        >
          <StageCanvas />
          <StageNote />
          <Hud />
        </section>
        <Dossier />
      </div>
    </ExplorerProvider>
  );
}

function openPanel(view: "worlds" | "beyond" | "sources") {
  window.dispatchEvent(new CustomEvent("anorix-panel", { detail: view }));
}

function Header() {
  const { theme, toggleTheme } = useExplorer();
  const next = theme === "light" ? "dark" : "light";
  return (
    <header className="site-header pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-7">
      <a href="https://anorix.dev" target="_blank" rel="noreferrer" className="pointer-events-auto flex min-w-0 items-baseline gap-2 no-underline">
        <span className="eyebrow shrink-0">Anorix</span>
        <span className="wordmark truncate text-[18px] font-light tracking-[-0.04em] text-white md:text-[22px]">Cosmos</span>
      </a>
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-full text-[#b4b4b4] transition-colors duration-150 hover:bg-[#111] hover:text-white"
          aria-label={next === "light" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggleTheme}
        >
          {theme === "light" ? <SunIcon /> : <MoonIcon />}
        </button>
        <a href="/explore" className="explore-cta" data-testid="explore-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor" /><ellipse cx="12" cy="12" rx="10.5" ry="3.6" stroke="currentColor" strokeWidth="1.6" transform="rotate(-20 12 12)" /></svg>
          <span>Explore</span><span className="hdr-long"> planets</span>
        </a>
        <button type="button" className="g-btn g-btn-soft hdr-opt" onClick={() => openPanel("worlds")}>
          Worlds
        </button>
        <button type="button" className="g-btn g-btn-soft hdr-opt" onClick={() => openPanel("beyond")}>
          Beyond
        </button>
        <button type="button" className="g-btn g-btn-soft hdr-opt hdr-sources" onClick={() => openPanel("sources")}>
          Sources
        </button>
      </div>
    </header>
  );
}

function MoonNamesToggle() {
  const [on, setOn] = useState(live.showMoonNames);
  return (
    <button
      type="button"
      className="orbit-toggle"
      aria-pressed={on}
      data-testid="moon-names"
      onClick={() => {
        live.showMoonNames = !live.showMoonNames;
        setOn(live.showMoonNames);
      }}
    >
      {on ? "Hide" : "Show"} all moon names
    </button>
  );
}

function StageNote() {
  const { scene, beyond, selected } = useExplorer();
  const { trueScale } = useExplorer();
  let note = trueScale ? "True scale · sizes and distances on one scale" : "True positions · sizes enlarged";
  if (scene === "anatomy") note = "Cutaway · thin shells exaggerated";
  if (scene === "formation") note = "Formation · dust to the present";
  if (scene === "beyond" && beyond === "universe") note = "Universe · real distances, linear at every zoom";
  if (scene === "beyond" && beyond === "milkyway") note = "Milky Way · model based on NASA/JPL-Caltech (SSC) illustration";
  if (scene === "beyond" && beyond === "proxima") note = "Proxima Centauri · 4.24 ly";
  if (scene === "beyond" && beyond === "sagittarius") note = "Sagittarius A* · accretion disk";
  if (scene === "orrery" && selected) note = "Click empty space to release";
  const focus = scene === "orrery" && selected ? BODIES[selected] : null;
  const count = focus && /^\d+$/.test(focus.moonsLabel) && focus.moonsLabel !== "0" ? Number(focus.moonsLabel) : 0;
  return (
    <>
      <p className="stage-note">{note}</p>
      {focus ? (
        <div className="focus-card" data-testid="focus-card">
          {count ? (
            <div className="focus-count">
              <b>{count}</b>
              <span>{count === 1 ? "moon" : "moons"} (NASA)</span>
            </div>
          ) : null}
          {count > 1 ? <p className="focus-sub">{moonsOf(selected!).length + minorMoonsOf(selected!).length} with JPL orbits, all drawn · click any</p> : null}
          {count > 4 ? <MoonNamesToggle /> : null}
          <a className="explore-cta" href={`/explore?body=${selected}`} data-testid="open-explorer">Open {focus.name} in Explorer →</a>
        </div>
      ) : null}
    </>
  );
}

function Hud() {
  const explorer = useExplorer();
  if (explorer.scene === "beyond" && explorer.beyond === "universe") return <UniverseHud />;
  if (explorer.scene === "formation") return <FormationHud />;
  if (explorer.scene === "anatomy" || explorer.scene === "beyond") return <ModeHud />;
  return <TimeHud />;
}

function TimeHud() {
  const explorer = useExplorer();
  const jd = unixToJd(explorer.displayMs);
  return (
    <div className="hud">
      <div className="hud-row">
        <button
          type="button"
          className="icon-btn"
          aria-label={explorer.playing ? "Pause time" : "Play time"}
          aria-pressed={explorer.playing}
          onClick={explorer.togglePlaying}
        >
          {explorer.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <label className="min-w-0">
          <span className="sr-only">Jump to date</span>
          <input
            className="cosmos-date hud-date"
            type="date"
            min="1700-01-01"
            max="2199-12-31"
            value={new Date(explorer.displayMs).toISOString().slice(0, 10)}
            onChange={(event) => {
              const ms = Date.parse(`${event.target.value}T00:00:00Z`);
              if (Number.isFinite(ms)) explorer.setSimMs(ms);
            }}
            title={formatSimDate(explorer.displayMs)}
          />
        </label>
        <div className="speed-seg" role="group" aria-label="Time scale, days per second">
          {SPEEDS.map((speed) => (
            <button
              key={speed.days}
              type="button"
              data-on={Math.abs(explorer.speed - speed.days) < 1e-6}
              onClick={() => explorer.setSpeed(speed.days)}
            >
              {speed.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="orbit-toggle"
        aria-pressed={explorer.showOrbits}
        data-on={explorer.showOrbits}
        title={`${explorer.showOrbits ? "Hide" : "Show"} orbit lines and mission trails (shortcut: O)`}
        onClick={explorer.toggleOrbits}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="10" ry="4.5" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" />
          <circle cx="21.2" cy="10.4" r="1.4" fill="currentColor" />
        </svg>
        Orbits {explorer.showOrbits ? "on" : "off"}
      </button>
      <p className="hud-meta mt-2">{explorer.playing ? "Running" : "Paused"} · Space to {explorer.playing ? "pause" : "play"} · JD {jd.toFixed(1)}</p>
      <input
        className="time-slider"
        type="range"
        min={SIM_MIN}
        max={SIM_MAX}
        step={86_400_000}
        value={Math.min(SIM_MAX, Math.max(SIM_MIN, explorer.displayMs))}
        aria-label="Simulation date"
        onChange={(event) => explorer.setSimMs(Number(event.target.value))}
      />
      <div className="hud-actions">
        <button type="button" className="hud-btn" onClick={explorer.jumpToday}>
          Today
        </button>
        <button
          type="button"
          className="hud-btn"
          data-on={explorer.trueScale}
          aria-pressed={explorer.trueScale}
          title="True scale: sizes and distances on one scale. Readable: sizes enlarged."
          onClick={explorer.toggleTrueScale}
        >
          {explorer.trueScale ? "True scale" : "Readable"}
        </button>
        <button type="button" className="hud-btn" data-on={explorer.frameKind === "inner" && !explorer.selected} onClick={() => explorer.frame("inner")}>
          Inner
        </button>
        <button type="button" className="hud-btn" data-on={explorer.frameKind === "system" && !explorer.selected} onClick={() => explorer.frame("system")}>
          System
        </button>
        <button type="button" className="hud-btn" data-on={explorer.frameKind === "full" && !explorer.selected} onClick={() => explorer.frame("full")}>
          Full
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={() => {
            live.uZoom = 1.8;
            live.uTarget = 4.2;
            explorer.openBeyond("universe");
          }}
        >
          Universe →
        </button>
      </div>
    </div>
  );
}

function FormationHud() {
  const explorer = useExplorer();
  const stage = Math.min(3, Math.floor(explorer.formation * 4));
  return (
    <div className="hud">
      <div className="hud-row">
        <button
          type="button"
          className="icon-btn"
          aria-label={explorer.formationPlaying ? "Pause formation" : "Play formation"}
          aria-pressed={explorer.formationPlaying}
          onClick={() => explorer.setFormationPlaying(!explorer.formationPlaying)}
        >
          {explorer.formationPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="hud-date">{FORMATION_STAGES[stage]}</div>
        <button type="button" className="hud-btn ml-auto" onClick={explorer.backToOrbits}>
          Back to orbits
        </button>
      </div>
      <input
        className="time-slider"
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(explorer.formation * 1000)}
        aria-label="Formation sequence"
        onChange={(event) => explorer.setFormation(Number(event.target.value) / 1000)}
      />
    </div>
  );
}

function ModeHud() {
  const explorer = useExplorer();
  const play = (
    <button
      type="button"
      className="icon-btn"
      aria-label={explorer.playing ? "Pause motion" : "Play motion"}
      aria-pressed={explorer.playing}
      onClick={explorer.togglePlaying}
    >
      {explorer.playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
  const title =
    explorer.scene === "anatomy"
      ? "Anatomy"
      : explorer.beyond === "universe"
        ? "Universe"
        : explorer.beyond === "milkyway"
        ? "Milky Way"
        : explorer.beyond === "proxima"
          ? "Proxima Centauri"
          : "Sagittarius A*";
  return (
    <div className="hud">
      <div className="hud-row">
        {play}
        <div className="hud-date">{title}</div>
        <button type="button" className="hud-btn ml-auto" onClick={explorer.backToOrbits}>
          Back to orbits
        </button>
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 1.5v9l8-4.5-8-4.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 1.5h3v9H2zM7 1.5h3v9H7z" fill="currentColor" />
    </svg>
  );
}
