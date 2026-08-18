# Microautobiography Template

A minimal Next.js 16 app that renders one page: an AI-narrated
**microautobiography**. Chapters of a person's life story are read aloud by
an ElevenLabs narrator over a low music bed, with a live waveform, sentence
level highlighting that tracks the voice, click-any-sentence seeking, image
carousels, and verse blocks for poems or scripture.

Worked example: [garysheng.com/bio](https://garysheng.com/bio).

> Screenshot placeholder: add a capture of your finished page here.

## Use this template

1. Click **Use this template** on GitHub (or fork/clone).
2. Follow [GENERATE.md](./GENERATE.md). It is the complete procedure: a
   structured life interview, the executable decisions (narrator persona,
   voice, palette, images, music), the build loop, and deploy. An AI coding
   agent can run it end to end.

Quick start for the impatient:

```bash
pnpm install
cp .env.local.example .env.local   # add your ElevenLabs API key + voice ID
# fill src/data/story-sections.ts with your chapters
npx tsx scripts/generate-story-narration.ts
pnpm dev
```

## What's inside

- `src/app/page.tsx`: the page shell (letterhead header, player, quiet close)
- `src/components/story-playback.tsx`: the player (cards, toolbar, carousel,
  keyboard shortcuts, sentence sync, and a chapter index: a fixed rail in the
  desktop gutter plus an in-flow card below `xl`)
- `src/app/globals.css`: the letterhead tokens **and the `.prose` rules the
  chapter cards depend on**. The player has no paragraph spacing of its own, so
  a copy of the player dropped into an app without these rules renders each
  chapter as one unbroken block
- `src/components/ui/`: sentence renderer, live waveform, and small UI
  primitives
- `src/hooks/useBackgroundMusic.ts`: the fading music bed (iOS-safe gain via
  Web Audio)
- `scripts/generate-story-narration.ts`: ElevenLabs TTS with timestamps plus
  sentence timing extraction; writes committed MP3s and
  `src/data/story-timings.json`
- `GENERATE.md`: the full generation procedure

No ElevenLabs calls happen at build or runtime; audio is generated once
locally and committed as static files.

## Credit

Extracted from [garysheng.com/bio](https://garysheng.com/bio).
