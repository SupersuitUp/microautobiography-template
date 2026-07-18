/**
 * Build the single concatenated narration stream + offset map that powers
 * lock-screen (background) playback on /bio. One continuous file lets a single
 * persistent <audio> element play through a locked phone; the offset map lets
 * the player derive per-section UI (current section, sentence sync, scroll,
 * jumps) from currentTime. Run after regenerating any section narration.
 *
 *   npx tsx scripts/build-full-narration.ts
 */
import { execFileSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { STORY_SECTIONS } from '../src/data/story-sections'

const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const OUT_DIR = path.join(PUBLIC_DIR, 'story-narration', '_full')
const OUT_MP3 = path.join(OUT_DIR, 'bio-narration-full.mp3')
const OFFSETS_JSON = path.resolve(process.cwd(), 'src/data/story-narration-offsets.json')

type SectionOffset = { id: string; start: number; duration: number }

function ffprobeDuration(file: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    file,
  ]).toString().trim()
  const d = parseFloat(out)
  if (!isFinite(d) || d <= 0) throw new Error(`Bad duration for ${file}: "${out}"`)
  return d
}

function main() {
  const sections = STORY_SECTIONS
  if (!sections.every((s) => !!s.audioUrl)) {
    throw new Error('Every section must have audioUrl before building the full narration.')
  }

  const files = sections.map((s) => {
    const rel = s.audioUrl!.replace(/^\//, '')
    const abs = path.join(PUBLIC_DIR, rel)
    if (!existsSync(abs)) throw new Error(`Missing narration file: ${abs}`)
    return abs
  })

  // Offsets from real per-file durations, accumulated in section order.
  const offsets: SectionOffset[] = []
  let acc = 0
  sections.forEach((s, i) => {
    const duration = ffprobeDuration(files[i])
    offsets.push({ id: s.id, start: acc, duration })
    acc += duration
  })

  // Single re-encode pass: normalize every input to 44.1k mono, concat, encode
  // once. One encode pass = one (constant, ~26ms) encoder priming delay for the
  // whole file instead of per-section padding that would accumulate across 20
  // sections and drift late-section sentence sync.
  mkdirSync(OUT_DIR, { recursive: true })
  const inputArgs = files.flatMap((f) => ['-i', f])
  const norm = files
    .map((_, i) => `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[a${i}]`)
    .join(';')
  const concatInputs = files.map((_, i) => `[a${i}]`).join('')
  const filter = `${norm};${concatInputs}concat=n=${files.length}:v=0:a=1[out]`

  execFileSync('ffmpeg', [
    '-y',
    ...inputArgs,
    '-filter_complex', filter,
    '-map', '[out]',
    '-b:a', '128k',
    OUT_MP3,
  ], { stdio: 'inherit' })

  writeFileSync(OFFSETS_JSON, JSON.stringify(offsets, null, 1))

  const total = acc
  console.log(`✓ Wrote ${OUT_MP3}`)
  console.log(`✓ Wrote ${OFFSETS_JSON} (${offsets.length} sections, ${total.toFixed(1)}s total)`)
}

main()
