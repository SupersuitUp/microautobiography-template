// Lock-screen / Control-Center integration for the narrated story. All calls
// are guarded so non-supporting browsers (and jsdom) are safe no-ops. Only the
// narration owns "now playing"; the lofi bed is intentionally not registered
// here.

export type MediaSessionHandlers = {
  play: () => void
  pause: () => void
  previoustrack: () => void
  nexttrack: () => void
  seekto: (time: number | undefined) => void
}

function ms(): MediaSession | null {
  if (typeof navigator === 'undefined') return null
  return 'mediaSession' in navigator ? navigator.mediaSession : null
}

export function setupMediaSession(handlers: MediaSessionHandlers): void {
  const session = ms()
  if (!session) return
  const set = (action: MediaSessionAction, cb: MediaSessionActionHandler) => {
    try { session.setActionHandler(action, cb) } catch { /* unsupported action */ }
  }
  // Only the essential transport for a narrated story: play/pause, section
  // prev/next, and absolute scrub. Relative ±Ns skip is intentionally omitted
  // (lock-screen scrubbing via seekto + setPositionState covers seeking).
  set('play', () => handlers.play())
  set('pause', () => handlers.pause())
  set('previoustrack', () => handlers.previoustrack())
  set('nexttrack', () => handlers.nexttrack())
  set('seekto', (d) => handlers.seekto((d as MediaSessionActionDetails).seekTime ?? undefined))
}

export function updateMediaMetadata(meta: {
  title: string
  artist?: string
  album?: string
  artwork?: string
}): void {
  const session = ms()
  if (!session || typeof MediaMetadata === 'undefined') return
  session.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist ?? '',
    album: meta.album ?? '',
    // Artwork only if the site supplies it (e.g. a chapter image or OG image).
    // No hard-coded default so the template stays generic.
    ...(meta.artwork
      ? { artwork: [{ src: meta.artwork, sizes: '1200x630', type: 'image/jpeg' }] }
      : {}),
  })
}

export function updateMediaPositionState(state: {
  duration: number
  position: number
  playbackRate: number
}): void {
  const session = ms()
  if (!session || typeof session.setPositionState !== 'function') return
  try {
    session.setPositionState({
      duration: state.duration,
      position: Math.min(state.position, state.duration),
      playbackRate: state.playbackRate || 1,
    })
  } catch { /* invalid state (e.g. NaN duration) */ }
}

export function setMediaPlaybackState(state: 'playing' | 'paused' | 'none'): void {
  const session = ms()
  if (!session) return
  session.playbackState = state
}

export function clearMediaSession(): void {
  const session = ms()
  if (!session) return
  for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as const) {
    try { session.setActionHandler(action, null) } catch { /* ignore */ }
  }
  session.metadata = null
  session.playbackState = 'none'
}
