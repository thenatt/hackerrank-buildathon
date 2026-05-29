// Maps a top-level corpus folder to a normalized `product_area` label.
//
// The corpus folder a chunk lives in is a strong, free signal for the product
// area. We normalize the raw folder names to the label set implied by the
// sample CSV (e.g. "hackerrank_community" -> "community", "general-help" ->
// "general"). Two labels are NOT folder-derived and are decided by the agent:
//   - "conversation_management": chit-chat / out-of-scope / courtesy messages
//   - ""                        (blank): escalations, matching the sample
const FOLDER_TO_AREA: Record<string, string> = {
  screen: "screen",
  hackerrank_community: "community",
  interviews: "interviews",
  settings: "settings",
  integrations: "integrations",
  library: "library",
  engage: "engage",
  skillup: "skillup",
  chakra: "chakra",
  "general-help": "general",
  uncategorized: "general",
};

/** The full set of folder-derived product areas the agent may choose from. */
export const FOLDER_PRODUCT_AREAS = Array.from(
  new Set(Object.values(FOLDER_TO_AREA)),
);

/** Non-folder areas the agent assigns by judgment. */
export const SPECIAL_PRODUCT_AREAS = ["conversation_management"];

/** Map a corpus folder to its normalized product_area (falls back to general). */
export function folderToProductArea(folder: string): string {
  return FOLDER_TO_AREA[folder] ?? "general";
}
