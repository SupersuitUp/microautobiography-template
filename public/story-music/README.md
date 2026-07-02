# The music bed

The player fades a looping instrumental in under the narration while it plays
(see `src/hooks/useBackgroundMusic.ts`). It expects one file here:

```
public/story-music/bed.mp3
```

If `bed.mp3` is missing, nothing breaks: the play call fails silently and the
story narrates without music. Everything else works.

## What makes a good bed

- **Instrumental only.** Vocals fight the narrator.
- **Around 4 minutes, loopable.** The player loops it; fade the ends of the
  track into each other (or add a short fade-in/fade-out) so the loop seam is
  not audible.
- **Quiet dynamics.** Lofi, ambient, or soft piano works. The player already
  ducks it to a low gain (about 14 percent) and fades it in and out over
  roughly two seconds, but a track with big swells will still poke through.
- **Small file.** Encode at ~96 kbps mono or stereo; the bed sits far behind
  the voice, so nobody will hear the difference:

  ```bash
  ffmpeg -i input.wav -b:a 96k bed.mp3
  ```

## Licensing

Do NOT commit a copyrighted track. This repo is public; use something you
made, commissioned, licensed, or that is genuinely royalty-free (and keep a
note of the license). AI music generators are also a fine source for a custom
bed.
