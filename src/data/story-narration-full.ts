import offsetsJson from './story-narration-offsets.json'

// One continuous narration stream + per-section offset map. Playing the whole
// story as a single element (rather than one element per section) is what lets
// /bio continue through a locked phone screen; the map lets the player derive
// per-section UI from currentTime. Regenerate both via
// scripts/build-full-narration.ts.

export type SectionOffset = { id: string; start: number; duration: number }

export const NARRATION_OFFSETS = offsetsJson as SectionOffset[]

export const FULL_NARRATION_URL = '/story-narration/_full/bio-narration-full.mp3'

export const NARRATION_TOTAL_DURATION = NARRATION_OFFSETS.reduce(
  (max, o) => Math.max(max, o.start + o.duration),
  0,
)

/** Index of the section containing global time `t`, clamped to valid range. */
export function sectionIndexAtTime(t: number): number {
  if (NARRATION_OFFSETS.length === 0) return 0
  if (t <= 0) return 0
  for (let i = NARRATION_OFFSETS.length - 1; i >= 0; i--) {
    if (t >= NARRATION_OFFSETS[i].start) return i
  }
  return 0
}

/** Global start time (seconds) of section `index`, or 0 if out of range. */
export function sectionStartTime(index: number): number {
  return NARRATION_OFFSETS[index]?.start ?? 0
}
