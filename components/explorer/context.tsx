"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BODY_ORDER,
  type BodyId,
} from "@/lib/bodies";
import { clampSim } from "@/lib/julian";
import { moonById, moonVisualRadius } from "@/lib/moons";
import { UOBJS } from "@/lib/universe";
import {
  liveMoon,
  live,
  type BeyondId,
  type FrameKind,
  type SceneMode,
  type TabId,
} from "@/lib/live";

type ThemeName = "dark" | "light";

interface ExplorerContextValue {
  theme: ThemeName;
  toggleTheme: () => void;
  selected: BodyId | null;
  select: (id: BodyId) => void;
  moon: string | null;
  selectMoon: (id: string | null) => void;
  playing: boolean;
  togglePlaying: () => void;
  speed: number;
  setSpeed: (daysPerSecond: number) => void;
  displayMs: number;
  setSimMs: (ms: number) => void;
  jumpToday: () => void;
  scene: SceneMode;
  beyond: BeyondId;
  openBeyond: (id: BeyondId) => void;
  tab: TabId;
  setTab: (tab: TabId) => void;
  backToOrbits: () => void;
  frameKind: FrameKind;
  frame: (kind: FrameKind) => void;
  formation: number;
  formationPlaying: boolean;
  setFormation: (value: number) => void;
  setFormationPlaying: (value: boolean) => void;
  publishClock: (ms: number, formationValue: number) => void;
  mission: string | null;
  selectMission: (id: string | null) => void;
  trueScale: boolean;
  toggleTrueScale: () => void;
  uObj: string | null;
  showOrbits: boolean;
  toggleOrbits: () => void;
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

function applyTheme(theme: ThemeName) {
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.setItem("anorix-theme", theme);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event("anorix-theme"));
}

function subscribeClock(callback: () => void) {
  window.addEventListener("anorix-clock", callback);
  return () => window.removeEventListener("anorix-clock", callback);
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("anorix-theme", callback);
  return () => window.removeEventListener("anorix-theme", callback);
}

function emitClock() {
  window.dispatchEvent(new Event("anorix-clock"));
}

function readTheme(): ThemeName {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function focusStage() {
  /* fixed app layout: nothing to scroll */
}

export function ExplorerProvider({ children, syncUrl = true }: { children: ReactNode; syncUrl?: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as ThemeName);
  const displayMs = useSyncExternalStore(subscribeClock, () => live.simMs, () => Date.UTC(2026, 9, 12));
  const playing = useSyncExternalStore(subscribeClock, () => live.playing, () => true);
  const formation = useSyncExternalStore(subscribeClock, () => live.formation, () => 0);
  const formationPlaying = useSyncExternalStore(subscribeClock, () => live.formationPlaying, () => false);
  const [selected, setSelected] = useState<BodyId | null>(null);
  const [moon, setMoonState] = useState<string | null>(null);
  const [speed, setSpeedState] = useState(1);
  const [scene, setScene] = useState<SceneMode>("orrery");
  const [beyond, setBeyond] = useState<BeyondId>("universe");
  const [uObj, setUObj] = useState<string | null>(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [tab, setTabState] = useState<TabId>("overview");
  const [frameKind, setFrameKind] = useState<FrameKind>("inner");
  const [mission, setMission] = useState<string | null>(null);
  const [trueScale, setTrueScale] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    live.simMs = clampSim(Date.now());
    live.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (live.reduce) live.playing = false;
    // Shareable state: ?body=saturn&moon=titan&mission=juno&date=2030-01-01&scale=true
    const q = new URLSearchParams(syncUrl ? window.location.search : "");
    const date = q.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const ms = Date.parse(`${date}T00:00:00Z`);
      if (Number.isFinite(ms)) {
        live.simMs = clampSim(ms);
        live.playing = false;
      }
    }
    if (q.get("scale") === "true") {
      live.trueScale = true;
      setTrueScale(true);
    }
    const body = q.get("body") as BodyId | null;
    const moonId = q.get("moon");
    const missionId = q.get("mission");
    // Defer until the event listeners below are attached.
    window.setTimeout(() => {
      if (moonId && moonById(moonId)) {
        window.dispatchEvent(new CustomEvent("anorix-moon", { detail: moonId }));
      } else if (body && BODY_ORDER.includes(body)) {
        window.dispatchEvent(new CustomEvent("anorix-select", { detail: body }));
      } else if (missionId) {
        window.dispatchEvent(new CustomEvent("anorix-mission", { detail: missionId }));
      }
    }, 0);
    emitClock();
    setUrlReady(true);
  }, []);

  useEffect(() => {
    const onU = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const o = UOBJS.find((x) => x.id === id);
      if (!o) return;
      live.uObj = id;
      live.uTarget = o.zoom;
      setUObj(id);
      window.dispatchEvent(new CustomEvent("anorix-panel", { detail: "beyond" }));
    };
    window.addEventListener("anorix-uobj", onU);
    return () => window.removeEventListener("anorix-uobj", onU);
  }, []);

  useEffect(() => {
    const onMission = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      live.mission = id;
      live.selected = null;
      live.scene = "orrery";
      liveMoon.id = null;
      setMoonState(null);
      setSelected(null);
      setScene("orrery");
      setMission(id);
      window.dispatchEvent(new CustomEvent("anorix-panel", { detail: "missions" }));
    };
    window.addEventListener("anorix-mission", onMission);
    return () => window.removeEventListener("anorix-mission", onMission);
  }, []);

  useEffect(() => {
    if (!urlReady || !syncUrl) return;
    const q = new URLSearchParams();
    if (moon) q.set("moon", moon);
    else if (selected) q.set("body", selected);
    else if (mission) q.set("mission", mission);
    if (!playing) q.set("date", new Date(displayMs).toISOString().slice(0, 10));
    if (trueScale) q.set("scale", "true");
    const next = q.toString();
    const url = next ? `?${next}` : window.location.pathname;
    if (`?${next}` !== window.location.search) window.history.replaceState(null, "", url);
  }, [urlReady, syncUrl, selected, moon, mission, playing, displayMs, trueScale]);

  useEffect(() => {
    const onClear = () => {
      live.selected = null;
      live.mission = null;
      setMission(null);
      liveMoon.id = null;
      setMoonState(null);
      setSelected(null);
    };
    window.addEventListener("anorix-select-clear", onClear);
    return () => window.removeEventListener("anorix-select-clear", onClear);
  }, []);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<BodyId>).detail;
      if (BODY_ORDER.includes(id)) {
        live.mission = null;
        setMission(null);
        liveMoon.id = null;
        setMoonState(null);
        live.selected = id;
        setSelected(id);
        live.playing = false; // selecting a world pauses time; play resumes
        emitClock();
        if (live.scene === "beyond") {
          live.scene = "orrery";
          setScene("orrery");
          setTabState("overview");
        }
      }
    };
    window.addEventListener("anorix-select", onSelect);
    return () => window.removeEventListener("anorix-select", onSelect);
  }, []);

  useEffect(() => {
    const onMoon = (event: Event) => {
      const data = moonById((event as CustomEvent<string>).detail);
      if (!data) return;
      live.mission = null;
      setMission(null);
      liveMoon.id = data.id;
      liveMoon.radius = moonVisualRadius(data);
      live.selected = data.parent;
      live.scene = "orrery";
      setSelected(data.parent);
      setMoonState(data.id);
      setScene("orrery");
      setTabState("moons");
      live.playing = false;
      emitClock();
    };
    window.addEventListener("anorix-moon", onMoon);
    return () => window.removeEventListener("anorix-moon", onMoon);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && (target as HTMLInputElement).type !== "range")) {
        return;
      }
      if (event.key === "o" || event.key === "O") {
        live.showOrbits = !live.showOrbits;
        setShowOrbits(live.showOrbits);
      }
      if (event.code === "Space") {
        event.preventDefault();
        live.playing = !live.playing;
        emitClock();
      }
      if (event.key === "Escape") {
        live.mission = null;
        setMission(null);
        liveMoon.id = null;
        setMoonState(null);
        live.selected = null;
        live.scene = "orrery";
        setSelected(null);
        setScene("orrery");
        setTabState("overview");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const selectMoon = useCallback((id: string | null) => {
    if (!id) {
      liveMoon.id = null;
      setMoonState(null);
      return;
    }
    window.dispatchEvent(new CustomEvent("anorix-moon", { detail: id }));
  }, []);

  const select = useCallback((id: BodyId) => {
    if (!BODY_ORDER.includes(id)) return;
    live.mission = null;
    setMission(null);
    liveMoon.id = null;
    setMoonState(null);
    live.selected = id;
    setSelected(id);
    live.playing = false; // selecting a world pauses time; play resumes
    emitClock();
    if (live.scene === "beyond") {
      live.scene = "orrery";
      setScene("orrery");
      setTabState("overview");
    }
  }, []);

  const togglePlaying = useCallback(() => {
    live.playing = !live.playing;
    emitClock();
  }, []);

  const setSpeed = useCallback((daysPerSecond: number) => {
    live.speed = daysPerSecond;
    setSpeedState(daysPerSecond);
  }, []);

  const setSimMs = useCallback((ms: number) => {
    live.simMs = clampSim(ms);
    emitClock();
  }, []);

  const jumpToday = useCallback(() => {
    live.simMs = clampSim(Date.now());
    emitClock();
  }, []);

  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    if (!live.selected) return;
    if (next === "anatomy") {
      live.scene = "anatomy";
      setScene("anatomy");
      focusStage();
      return;
    }
    if (next === "formation") {
      live.scene = "formation";
      setScene("formation");
      if (!live.reduce) {
        live.formationPlaying = true;
        emitClock();
      }
      focusStage();
      return;
    }
    if (live.scene !== "beyond") {
      live.scene = "orrery";
      setScene("orrery");
    }
  }, []);

  const openBeyond = useCallback((id: BeyondId) => {
    live.beyond = id;
    live.scene = "beyond";
    live.selected = null;
    setBeyond(id);
    setScene("beyond");
    setSelected(null);
  }, []);

  const backToOrbits = useCallback(() => {
    live.scene = "orrery";
    setScene("orrery");
    setTabState("overview");
  }, []);

  const frame = useCallback((kind: FrameKind) => {
    live.mission = null;
    setMission(null);
    liveMoon.id = null;
    setMoonState(null);
    live.selected = null;
    live.scene = "orrery";
    live.frameKind = kind;
    live.frameNonce += 1;
    setSelected(null);
    setScene("orrery");
    setTabState("overview");
    setFrameKind(kind);
  }, []);

  const setFormation = useCallback((value: number) => {
    live.formation = Math.min(1, Math.max(0, value));
    live.formationPlaying = false;
    emitClock();
  }, []);

  const setFormationPlaying = useCallback((value: boolean) => {
    live.formationPlaying = value;
    emitClock();
  }, []);

  const publishClock = useCallback(() => {
    emitClock();
  }, []);

  const selectMission = useCallback((id: string | null) => {
    if (id) {
      window.dispatchEvent(new CustomEvent("anorix-mission", { detail: id }));
      return;
    }
    live.mission = null;
    setMission(null);
  }, []);

  const toggleOrbits = useCallback(() => {
    live.showOrbits = !live.showOrbits;
    setShowOrbits(live.showOrbits);
  }, []);

  const toggleTrueScale = useCallback(() => {
    live.trueScale = !live.trueScale;
    setTrueScale(live.trueScale);
  }, []);

  const value = useMemo<ExplorerContextValue>(
    () => ({
      theme,
      toggleTheme,
      selected,
      select,
      moon,
      selectMoon,
      playing,
      togglePlaying,
      speed,
      setSpeed,
      displayMs,
      setSimMs,
      jumpToday,
      scene,
      beyond,
      openBeyond,
      tab,
      setTab,
      backToOrbits,
      frameKind,
      frame,
      formation,
      formationPlaying,
      setFormation,
      setFormationPlaying,
      publishClock,
      mission,
      selectMission,
      trueScale,
      toggleTrueScale,
      uObj,
      showOrbits,
      toggleOrbits,
    }),
    [
      uObj,
      showOrbits,
      toggleOrbits,
      mission,
      selectMission,
      trueScale,
      toggleTrueScale,
      theme,
      toggleTheme,
      selected,
      select,
      moon,
      selectMoon,
      playing,
      togglePlaying,
      speed,
      setSpeed,
      displayMs,
      setSimMs,
      jumpToday,
      scene,
      beyond,
      openBeyond,
      tab,
      setTab,
      backToOrbits,
      frameKind,
      frame,
      formation,
      formationPlaying,
      setFormation,
      setFormationPlaying,
      publishClock,
    ],
  );

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>;
}

export function useExplorer(): ExplorerContextValue {
  const value = useContext(ExplorerContext);
  if (!value) throw new Error("useExplorer must be used inside ExplorerProvider");
  return value;
}
