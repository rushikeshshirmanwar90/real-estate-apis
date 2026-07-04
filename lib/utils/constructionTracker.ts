// Mirrors Xsite/services/constructionTrackerService.ts exactly — keep the two in sync.

export const SLAB_WORK_SUB_PHASES = [
  "Shuttering",
  "Reinforcement",
  "Electrical Conduits",
  "Plumbing Sleeves",
  "Inspection",
  "Concreting",
  "Curing",
  "De-shuttering",
  "Completed",
];

export const FLOOR_PHASES = [
  "Column Work",
  "Slab Work",
  "Brickwork",
  "Electrical Concealed",
  "Plumbing Concealed",
  "Plastering",
  "Waterproofing",
  "Flooring",
  "Putty",
  "Painting",
  "Doors & Windows",
  "Electrical Fixtures",
  "Plumbing Fixtures",
  "Finishing",
  "Completed",
];

export const FOUNDATION_PHASES = [
  "Excavation",
  "PCC",
  "Footing Reinforcement",
  "Footing Concrete",
  "Column Starter",
  "Plinth Beam",
  "Backfilling",
  "Compaction",
  "Foundation Complete",
];

export const TERRACE_PHASES = [
  "Slab Work",
  "Waterproofing",
  "Parapet Wall",
  "Water Tank Work",
  "Solar Installation",
  "Terrace Finishing",
  "Completed",
];

// Picks the right phase list for any section name the app actually uses — not just
// the 3 keyword groups below. Foundation and Terrace get their dedicated lists; every
// other section (Ground/First/Tower A/custom names, etc.) gets the standard floor list.
export const phaseNamesForSection = (sectionName: string): string[] => {
  const lower = sectionName.toLowerCase();
  if (lower.includes("foundation")) return FOUNDATION_PHASES;
  if (lower.includes("terrace")) return TERRACE_PHASES;
  return FLOOR_PHASES;
};

export const buildPhase = (name: string, order: number) => ({
  name,
  order,
  status: "NOT_STARTED",
  progress: 0,
  subPhases:
    name === "Slab Work"
      ? SLAB_WORK_SUB_PHASES.map((spName) => ({ name: spName, progress: 0, status: "NOT_STARTED" }))
      : [],
  dailyUpdates: [],
  images: [],
  documents: [],
});

// Builds the initial phase list for a new tracker — only the FIRST phase is created
// upfront. Subsequent phases are appended one-at-a-time as each phase completes.
export const buildPhases = (sectionName: string) => {
  const names = phaseNamesForSection(sectionName);
  return [buildPhase(names[0], 0)];
};

export const average = (values: number[]): number =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

export const statusForProgress = (progress: number): string =>
  progress >= 100 ? "COMPLETED" : progress <= 0 ? "NOT_STARTED" : "IN_PROGRESS";

// Recomputes and returns the overall average progress across a mini-section's own
// phases — call after mutating any phase's progress, then assign tracker.overallProgress.
export const recalculatePhases = (phases: any[]): number =>
  average(phases.map((p) => p.progress));
