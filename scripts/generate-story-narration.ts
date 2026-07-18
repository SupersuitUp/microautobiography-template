/**
 * Generate AI narration MP3s for the story sections via ElevenLabs.
 *
 * Usage: npx tsx scripts/generate-story-narration.ts [--only <sectionId>]
 *
 * Reads ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID from .env.local (never
 * committed) or the environment.
 *
 * Writes:
 *   public/story-narration/<sectionId>.mp3  - the narration audio. These ARE
 *     committed so the site serves them statically with no ElevenLabs
 *     dependency at runtime (and no env vars needed on the deploy host).
 *   src/data/story-timings.json - sentence-level timings extracted from the
 *     ElevenLabs character alignment. This is what powers the live sentence
 *     highlighting and click-any-sentence seeking in the player.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import path from 'path'
import os from 'os'
import { STORY_SECTIONS } from '../src/data/story-sections'

const MODEL_ID = 'eleven_multilingual_v2'
const OUT_DIR = path.resolve(process.cwd(), 'public/story-narration')

// ---------------------------------------------------------------------------
// SPLICES: interleave REAL audio clips between narration segments.
//
// The mechanic: for a section listed here, its content is split (in order) on
// each splice's `marker` - the literal markdown text of the quote as it
// appears in the section content. The narrator reads the text around the
// markers; the real clips play in the gaps (with a short breath of silence
// before each clip). The marker itself becomes one clickable "sentence" in
// the player, spanning the clips, so highlighting and click-to-seek still
// work. Requires ffmpeg + ffprobe on your PATH.
//
// Example entry:
//   SPLICES['my-section-id'] = [
//     {
//       marker: '*"The exact quote."* *"As written in content."*',
//       clips: ['/absolute/path/to/clip-one.wav', '/absolute/path/to/clip-two.mp3'],
//       gain: 1.0, // volume multiplier applied to the clips
//     },
//   ]
//
// Leave empty if you have no real audio clips to weave in (most stories don't).
// ---------------------------------------------------------------------------
export type Splice = { marker: string; clips: string[]; gain: number }
export const SPLICES: Record<string, Splice[]> = {}

function loadEnvValue(name: string): string | null {
  if (process.env[name]) return process.env[name] as string
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(new RegExp(`^${name}=(.+)$`))
      if (m) return m[1].trim()
    }
  }
  return null
}

function loadApiKey(): string {
  const key = loadEnvValue('ELEVENLABS_API_KEY')
  if (!key) throw new Error('ELEVENLABS_API_KEY not found in env or .env.local')
  return key
}

function loadVoiceId(): string {
  const id = loadEnvValue('ELEVENLABS_VOICE_ID')
  if (!id) {
    console.warn(
      '! ELEVENLABS_VOICE_ID not set - using placeholder. ' +
        'Pick a voice from the ElevenLabs Voice Library and set it in .env.local.',
    )
    return 'YOUR_VOICE_ID' // placeholder; the API will reject it
  }
  return id
}

/** Strip markdown down to plain spoken text. */
function toSpokenText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links -> text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type Alignment = {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

async function tts(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<{ buf: Buffer; alignment: Alignment }> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const json = (await res.json()) as {
    audio_base64: string
    alignment: Alignment
  }
  return {
    buf: Buffer.from(json.audio_base64, 'base64'),
    alignment: json.alignment,
  }
}

// ---- sentence timing extraction ----------------------------------------

export type SentenceTiming = { md: string; start: number; end: number }
export type SectionTimings = { paragraphs: SentenceTiming[][] }

/** Split one markdown paragraph into sentence-sized chunks. Tolerates
 * closing quotes/italics/brackets after the terminator. */
function splitSentences(paragraphMd: string): string[] {
  const raw = paragraphMd
    .split(/(?<=[^A-Z][.!?:]["*”)\]]{0,3})\s+(?=[A-Z"“*\[(0-9])/)
    .map((x) => x.trim())
    .filter(Boolean)
  // Never leave a chunk with unbalanced italics/bold: merge forward until the
  // asterisk count is even (keeps e.g. a full italic scripture line intact).
  const parts: string[] = []
  let buf = ''
  for (const part of raw) {
    buf = buf ? `${buf} ${part}` : part
    const stars = (buf.match(/\*/g) || []).length
    if (stars % 2 === 0) {
      parts.push(buf)
      buf = ''
    }
  }
  if (buf) parts.push(buf)
  return parts.length ? parts : [paragraphMd.trim()]
}

/** Timing for each sentence of `contentMd`, using the TTS alignment of the
 * spoken (markdown-stripped) text, shifted by `offset` seconds. */
function timeSentences(
  contentMd: string,
  spokenFull: string,
  alignment: Alignment,
  offset: number,
): SentenceTiming[][] {
  const chars = alignment.characters
  const starts = alignment.character_start_times_seconds
  const ends = alignment.character_end_times_seconds
  const full = chars.join('')
  // The alignment covers the exact text we sent; sanity-check.
  if (full.replace(/\s+/g, ' ').trim() !== spokenFull.replace(/\s+/g, ' ').trim()) {
    console.warn('  ! alignment text drift (continuing, timings may be near-exact)')
  }
  let cursor = 0
  const paragraphs: SentenceTiming[][] = []
  for (const para of contentMd.split(/\n\n+/)) {
    const row: SentenceTiming[] = []
    for (const sentenceMd of splitSentences(para)) {
      const base = toSpokenText(sentenceMd)
      if (!base) continue
      // The TTS input may have had a trailing colon flattened to a period.
      const candidates = [base, base.replace(/:$/, '.'), base.replace(/\*/g, '')]
      let idx = -1
      let spoken = base
      for (const c of candidates) {
        idx = full.indexOf(c, cursor)
        if (idx !== -1) {
          spoken = c
          break
        }
      }
      if (idx === -1) {
        console.warn(`  ! sentence not found in alignment: "${base.slice(0, 50)}"`)
        continue
      }
      const i0 = idx
      const i1 = idx + spoken.length - 1
      cursor = i1 + 1
      row.push({
        md: sentenceMd,
        start: +(offset + (starts[i0] ?? 0)).toFixed(3),
        end: +(offset + (ends[i1] ?? starts[i0] ?? 0)).toFixed(3),
      })
    }
    if (row.length) paragraphs.push(row)
  }
  return paragraphs
}

function probeDuration(file: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
  ]).toString().trim()
  return parseFloat(out)
}

/** Sections with SPLICES entries: narration segments interleaved with real
 * sound clips. Returns sentence timings including the quote markers mapped
 * to clip spans. Requires ffmpeg + ffprobe. */
async function generateWithSplices(
  section: (typeof STORY_SECTIONS)[number],
  splices: Splice[],
  apiKey: string,
  voiceId: string,
): Promise<SectionTimings> {
  const narrationParts: string[] = []
  let rest = section.content
  for (const splice of splices) {
    const [before, after] = rest.split(splice.marker)
    if (after === undefined) {
      throw new Error(`${section.id}: splice marker not found: ${splice.marker}`)
    }
    narrationParts.push(before)
    rest = after
  }
  narrationParts.push(rest)

  const tmp = path.join(os.tmpdir(), `splice-${process.pid}`)
  mkdirSync(tmp, { recursive: true })

  const partFiles: string[] = []
  const partAlignments: Alignment[] = []
  const partSpoken: string[] = []
  for (let i = 0; i < narrationParts.length; i++) {
    const text = toSpokenText(narrationParts[i]).replace(/:$/, '.')
    const { buf, alignment } = await tts(text, apiKey, voiceId)
    const f = path.join(tmp, `part${i}.mp3`)
    writeFileSync(f, buf)
    partFiles.push(f)
    partAlignments.push(alignment)
    partSpoken.push(text)
  }

  // Assemble items and compute running offsets for timing composition.
  type Item = { file: string; gain: number } | { silence: number }
  const items: Item[] = []
  const partOffsets: number[] = []
  const spliceSpans: { start: number; end: number }[] = []
  let clock = 0
  for (let i = 0; i < narrationParts.length; i++) {
    partOffsets.push(clock)
    items.push({ file: partFiles[i], gain: 1 })
    clock += probeDuration(partFiles[i])
    const splice = splices[i]
    if (splice) {
      const spliceStart = clock
      for (const clip of splice.clips) {
        items.push({ silence: 0.35 })
        clock += 0.35
        items.push({ file: clip, gain: splice.gain })
        clock += probeDuration(clip)
      }
      items.push({ silence: 0.5 })
      clock += 0.5
      spliceSpans.push({ start: spliceStart, end: clock - 0.5 })
    }
  }

  const inputs: string[] = []
  const filters: string[] = []
  const chain: string[] = []
  let inputIdx = 0
  let silenceIdx = 0
  for (const item of items) {
    if ('silence' in item) {
      const tag = `s${silenceIdx++}`
      filters.push(`anullsrc=r=44100:cl=mono:d=${item.silence}[${tag}]`)
      chain.push(`[${tag}]`)
    } else {
      inputs.push('-i', item.file)
      const tag = `a${inputIdx}`
      filters.push(
        `[${inputIdx}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=${item.gain}[${tag}]`,
      )
      chain.push(`[${tag}]`)
      inputIdx++
    }
  }
  filters.push(`${chain.join('')}concat=n=${chain.length}:v=0:a=1[out]`)

  const outPath = path.join(OUT_DIR, `${section.id}.mp3`)
  execFileSync('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[out]',
    '-b:a', '128k',
    outPath,
  ], { stdio: 'pipe' })

  // Compose timings: each narration part timed with its offset; each marker
  // becomes one clickable "sentence" spanning its clips.
  const paragraphs: SentenceTiming[][] = []
  for (let i = 0; i < narrationParts.length; i++) {
    const partParas = timeSentences(
      narrationParts[i],
      partSpoken[i],
      partAlignments[i],
      partOffsets[i],
    )
    if (i === 0) {
      paragraphs.push(...partParas)
    } else {
      // The text after a marker continues the same display paragraph.
      const [first, ...rest2] = partParas
      if (first) {
        const last = paragraphs[paragraphs.length - 1]
        if (last) last.push(...first)
        else paragraphs.push(first)
      }
      paragraphs.push(...rest2)
    }
    const splice = splices[i]
    if (splice) {
      const span = spliceSpans[i]
      const last = paragraphs[paragraphs.length - 1]
      const markerTiming = {
        md: splice.marker,
        start: +span.start.toFixed(3),
        end: +span.end.toFixed(3),
      }
      if (last) last.push(markerTiming)
      else paragraphs.push([markerTiming])
    }
  }

  rmSync(tmp, { recursive: true, force: true })
  const kb = readFileSync(outPath).length / 1024
  console.log(`+ ${section.id} spliced with real clips (${kb.toFixed(0)} KB)`)
  return { paragraphs }
}

async function generate(
  section: (typeof STORY_SECTIONS)[number],
  apiKey: string,
  voiceId: string,
): Promise<SectionTimings> {
  const text = toSpokenText(section.content)
  const { buf, alignment } = await tts(text, apiKey, voiceId)
  const outPath = path.join(OUT_DIR, `${section.id}.mp3`)
  writeFileSync(outPath, buf)
  console.log(`+ ${section.id} (${(buf.length / 1024).toFixed(0)} KB)`)
  return { paragraphs: timeSentences(section.content, text, alignment, 0) }
}

async function main() {
  const apiKey = loadApiKey()
  const voiceId = loadVoiceId()
  mkdirSync(OUT_DIR, { recursive: true })

  const onlyIdx = process.argv.indexOf('--only')
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null

  const timingsPath = path.resolve(process.cwd(), 'src/data/story-timings.json')
  const allTimings: Record<string, SectionTimings> = existsSync(timingsPath)
    ? JSON.parse(readFileSync(timingsPath, 'utf8'))
    : {}

  for (const section of STORY_SECTIONS) {
    if (only && section.id !== only) continue
    const splices = SPLICES[section.id]
    if (splices && splices.length) {
      console.log(`> ${section.id}: narration + real clips`)
      allTimings[section.id] = await generateWithSplices(
        section, splices, apiKey, voiceId,
      )
      continue
    }
    console.log(`> ${section.id}`)
    allTimings[section.id] = await generate(section, apiKey, voiceId)
  }

  // Drop timings for sections that no longer exist.
  const liveIds = new Set(STORY_SECTIONS.map((s) => s.id))
  for (const id of Object.keys(allTimings)) {
    if (!liveIds.has(id)) delete allTimings[id]
  }
  writeFileSync(timingsPath, JSON.stringify(allTimings, null, 1))
  console.log(`Wrote ${timingsPath}`)

  // Rebuild the concatenated background-playback stream + offset map so the
  // lock-screen player stays in sync with per-section narration edits.
  console.log('→ Rebuilding full narration stream (background/lock-screen playback)')
  execFileSync('npx', ['tsx', 'scripts/build-full-narration.ts'], { stdio: 'inherit' })

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
