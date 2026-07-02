# GENERATE.md: The Microautobiography Procedure

This document is the full, agent-runnable procedure for turning this template
into a finished, deployed, AI-narrated life story. Follow it top to bottom.
An AI agent (Claude Code, Cursor, etc.) can execute it directly; a human can
too. Phases A and B are conversation; Phases C and D are build and ship.

## What you're building

A single-page web experience where an AI narrator tells the chapters of one
person's life out loud: an ElevenLabs voice reads each chapter while the
exact sentence being spoken glows, any sentence can be clicked to jump the
audio there, a low music bed fades in underneath, a live waveform pulses in
the toolbar, and chapters carry photos (single or carousel), optional video,
and verse blocks for poems or scripture. The worked example this template was
extracted from is [garysheng.com/bio](https://garysheng.com/bio). Visit it
first; everything below will make more sense once you've heard 30 seconds of
it.

## Prerequisites

- **Node 20+** (`node --version`)
- **pnpm** (`npm install -g pnpm` if missing)
- **An ElevenLabs account and API key.**
  1. Sign up at [elevenlabs.io](https://elevenlabs.io) (the free tier is
     enough to prototype; a full ~10-chapter story with several regeneration
     passes fits comfortably in the Starter tier).
  2. Click your profile avatar (bottom-left) > **API Keys** > **Create API
     Key**. Copy it somewhere safe; you will put it in `.env.local` in
     Phase C.
- **An ElevenLabs voice ID.** Browse the
  [Voice Library](https://elevenlabs.io/app/voice-library), audition voices,
  and add one to your workspace ("My Voices"). Open the voice and copy its
  **Voice ID** (a short alphanumeric string). You will choose this
  deliberately in Phase B; for now just know where it lives.
- **A Vercel account** for deploy (free Hobby tier is fine), or any host that
  runs Next.js.
- Optional: **ffmpeg + ffprobe** on your PATH, only if you use the audio
  splice mechanic (real sound clips woven between narration segments; see
  `SPLICES` in `scripts/generate-story-narration.ts`).

## Phase A: The Life Interview

Interview the subject. **Ask one question at a time.** Wait for the full
answer before moving on. Capture answers verbatim (voice transcription is
ideal); the raw phrasing is gold you will mine in Phase C. Do not summarize
while collecting.

1. **Where does your story actually begin?** Not your birth: your family,
   the people and events before you were born that made you possible.
   Grandparents, migrations, wars, faith, luck. The best cold opens start a
   generation or three back.
2. **What are the 3 to 6 defining chapters of your life so far?** For each
   one: what happened, what it cost, and what it built in you. Push past
   resume lines to the actual turning points.
3. **What are the most interesting or impressive moments a stranger should
   know?** Named achievements, famous rooms, wild anecdotes, statistics.
   These become the bolded proper nouns and the narrator's dry asides.
4. **What do you do now, in one flat sentence?** No adjectives, no mission
   statement. The plain answer.
5. **Where are you going?** What should the reader believe about your future
   by the end of the page? This shapes the second-to-last chapter.
6. **What do you believe that most people around you don't?** This gives the
   story a spine and the narrator something honest to gesture at.
7. **How should it end?** A vow, a poem, a letter to the reader, an
   invitation. Pick the form now; you will write it in Phase C. If the
   subject has a text that matters to them (a scripture, a poem, a family
   saying), this is where it lives, rendered as a verse block.

## Phase B: Executable decisions

Lock these decisions before writing a word of chapter content. Each one is a
build parameter.

### 1. Narrator persona and name

The narrator is an AI speaking in first person ("I") about the subject in
third person ("she", "he", "they", or their name). This framing is the whole
trick: it licenses affectionate distance, fact-checking jokes, and lines a
person could never say about themselves.

Give the narrator a name. Then calibrate the tone:

- Too dry: "Subject attended university from 2011 to 2015."
- Too gushing: "And then our INCREDIBLE hero did the most AMAZING thing!"
- Right: "Most origin stories don't require bipartisan legislation. This one
  did. I checked the math."

The narrator is likable, precise, lightly amused, and never impressed with
itself. See the rules section at the bottom for the hard constraints.

### 2. ElevenLabs voice ID

Pick the voice BEFORE naming the narrator, or at minimum verify them
together: the voice's gender and register must match the persona name, or
the illusion collapses in the first three seconds. Audition candidates in
the Voice Library by pasting a real paragraph of your draft cold open, not
"hello world". Warm, conversational voices with a smile in them outperform
"announcer" voices for this format. Copy the chosen Voice ID; it goes in
`.env.local` as `ELEVENLABS_VOICE_ID`.

### 3. Palette

The default letterhead is ink (#0A0B10), bone (#EDEAE2), and old gold
(#C2A15C). It reads formal and warm. Keep it or swap it: the four tokens at
the top of `src/app/globals.css` (`--ground`, `--ink-text`, `--accent`,
`--hairline`) drive the page shell. The accent gold also appears as literal
hex inside the player components; search the repo for `#C2A15C` and
`rgba(194,161,92` to swap the palette completely. Fraunces stays as the
display face unless you have a strong reason.

### 4. Image inventory

Walk the chapter list and assign images. Rules:

- **Real photos beat generated art. Always.** Scan old albums, ask family.
- Fully AI-generated art is allowed for scenes with no possible photo (an
  ancestor's life, a historical moment), but it must be disclosed in the
  caption: "An imagining of ..." is the house style.
- 2+ images on a chapter renders as an auto-rotating carousel; one image
  renders alone with a caption.
- Export to WebP or compressed PNG/JPG at ~1200px wide and drop files in
  `public/story-images/`.

### 5. Music bed

Choose the bed track per `public/story-music/README.md` (about 4 minutes,
loopable, instrumental, ~96kbps, saved as `public/story-music/bed.mp3`).
Never a copyrighted track; this repo is public. If you skip the bed the site
still works, just drier.

### 6. Chapter list locked

Write the final chapter list: id, title, one-line summary each. Standard
arc: a cold open where the narrator introduces itself, 3 to 6 life chapters,
one "what they do now / where this is going" chapter, and a closing vow or
poem. Ten chapters is the practical ceiling before the page starts to feel
long. Ids become filenames; pick clean slugs (`cold-open`, `origins`,
`the-turn`, `closing`).

## Phase C: Build

1. **Install and boot.**

   ```bash
   pnpm install
   pnpm dev
   ```

   Open http://localhost:3000. You will see the placeholder chapters with the
   toolbar stuck on "Loading..." because no narration MP3s exist yet. That is
   expected.

2. **Fill `src/data/story-sections.ts`.** Replace the three placeholder
   chapters with your locked chapter list. Every `{{...}}` placeholder in the
   repo must be replaced (grep for `{{` when you think you are done; also
   `src/app/layout.tsx` and `src/app/page.tsx` have them). Write for the ear:
   - Contractions everywhere. "He didn't" not "He did not".
   - Short sentences. One beat per paragraph.
   - Bold the proper nouns a stranger should remember.
   - Read every chapter out loud before accepting it. If you stumble, the
     voice will too.
   - Inline markdown is limited to bold, italic, and links. Verse blocks
     (poems, scripture) are paragraphs wrapped entirely in italics, or use
     `poemAfterIntro: true` on the closing section.

3. **Set env vars.** Copy `.env.local.example` to `.env.local` and fill in
   `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`.

4. **Generate narration.**

   ```bash
   npx tsx scripts/generate-story-narration.ts
   ```

   This writes one MP3 per chapter into `public/story-narration/` and the
   sentence timing map into `src/data/story-timings.json`. Verify the JSON is
   non-empty and has a key per chapter id. Watch the console for
   `! sentence not found in alignment` warnings; they usually mean exotic
   punctuation confused the sentence splitter. Simplify the sentence and
   regenerate.

5. **Review in the browser.** `pnpm dev`, press play, listen to the whole
   thing. Check: sentence highlighting tracks the voice, clicking a sentence
   seeks there, the carousel rotates, captions are right, the bed fades in.

6. **Iterate per chapter.** Any content edit desyncs that chapter's
   highlighting, so after EVERY text change:

   ```bash
   npx tsx scripts/generate-story-narration.ts --only <chapter-id>
   ```

   This regenerates just that chapter's audio and timings. Iterate until the
   read is right. Mispronunciations can usually be fixed with spelling
   tricks or added commas; keep the display text clean and prefer rewording
   over phonetic hacks.

7. **Commit the audio.** The MP3s and `story-timings.json` are committed on
   purpose: the deployed site is fully static about its audio and needs no
   ElevenLabs key at runtime.

## Phase D: Deploy

1. `pnpm build` locally; fix anything it complains about.
2. Push the repo to GitHub.
3. Import the repo at [vercel.com/new](https://vercel.com/new). Framework
   preset: Next.js. No environment variables are needed at runtime; the
   narration MP3s and timings are committed static files, and the ElevenLabs
   key is only used by the local generation script.
4. Deploy, then listen to the whole story once on the production URL and
   once on a phone. Autoplay policies and audio quirks show up on mobile
   Safari first.
5. Optional: attach a custom domain in the Vercel project settings.

## Rules learned from the reference build

Hard-won. Do not relearn them the expensive way.

- **Every content edit requires regenerating that chapter's audio.** The
  sentence highlighting is aligned to the exact spoken text; even a one-word
  edit desyncs the chapter. `--only <id>` makes this cheap.
- **Every section needs an `audioUrl` or the toolbar hides.** The player
  enables audio only when ALL sections have one. One missing `audioUrl`
  silently turns the page into a scroll-only story.
- **Inline markdown is limited to bold, italic, and links.** The sentence
  renderer handles `**bold**`, `*italic*`, `***both***`, and `[links](url)`.
  Headings, lists, and images inside `content` will not render in narrated
  sections.
- **Verse blocks are for poems and scripture.** Wrap whole paragraphs in
  italics (or set `poemAfterIntro`) and they render as a bordered serif
  block, visually separate from prose.
- **Keep the narrator likable.** No self-lore (the narrator's backstory is
  not the story), no flattery of the subject (state impressive facts flatly
  and let them land), and dry one-liners land better than exclamation
  points. The narrator is a witness with taste, not a hype man.
- **Real photos beat generated images**, and generated ones must say so in
  the caption ("An imagining of ...").
- **Before narration exists, the toolbar shows "Loading..." forever.** Not a
  bug; generate the audio.
