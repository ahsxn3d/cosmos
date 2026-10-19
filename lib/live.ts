import * as THREE from "three";
import { BODY_ORDER, type BodyId } from "./bodies";

export type SceneMode = "orrery" | "anatomy" | "formation" | "beyond";
export type BeyondId = "universe" | "milkyway" | "proxima" | "sagittarius";
export type FrameKind = "inner" | "system" | "full";
export type TabId = "overview" | "history" | "moons" | "anatomy" | "unusual" | "formation";

export const livePositions: Record<BodyId, THREE.Vector3> = Object.fromEntries(
  BODY_ORDER.map((id) => [id, new THREE.Vector3()]),
) as Record<BodyId, THREE.Vector3>;

export const live = {
  simMs: Date.UTC(2026, 9, 12),
  playing: true,
  speed: 1,
  selected: null as BodyId | null,
  hovered: null as BodyId | null,
  scene: "orrery" as SceneMode,
  beyond: "universe" as BeyondId,
  frameNonce: 0,
  frameKind: "inner" as FrameKind,
  reduce: false,
  formation: 0,
  formationPlaying: false,
  /** Bodies drawn at true size relative to true distances. */
  trueScale: false,
  mission: null as string | null,
  showOrbits: true,
  showMoonNames: false,
  /** log10 of the universe view radius in AU. */
  uZoom: 1.8,
  uTarget: 1.8,
  uObj: null as string | null,
};

export const missionPositions: Record<string, THREE.Vector3> = {};

export const moonPositions: Record<string, THREE.Vector3> = {};

export const liveMoon = {
  id: null as string | null,
  radius: 0.1,
};

if (typeof window !== "undefined") (window as unknown as { __cosmos: unknown }).__cosmos = { live, liveMoon, moonPositions, livePositions };
