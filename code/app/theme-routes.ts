// Hash-based routing for the pipeline mode only. The app is light-only, so the
// hash no longer carries a theme — it just selects which logic model runs:
//   (no hash) -> v1 (the original /api/process pipeline)
//   #v2       -> v2 (the Evidence x Risk /api/process-v2 pipeline)

export type Mode = "v1" | "v2";

/** Resolve the pipeline mode from a location hash. SSR-safe: defaults to v1. */
export function modeFromHash(hash: string): Mode {
  return hash.includes("v2") ? "v2" : "v1";
}
