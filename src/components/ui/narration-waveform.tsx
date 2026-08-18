'use client'

import { useEffect, useRef, type RefObject } from 'react'

// Live waveform for the narration toolbar. Gold bars mirrored around a center
// line, driven by a Web Audio analyser on the narration element, with the
// spark seal breathing alongside. Falls back to a quiet idle state when
// paused or when Web Audio is unavailable.

const GOLD = '#C2A15C'
const BAR_COUNT = 24

// One shared context; each narration element gets exactly one source node.
let sharedCtx: AudioContext | null = null
const analysers = new WeakMap<HTMLMediaElement, AnalyserNode>()

// iOS/Safari ignores HTMLMediaElement.playbackRate once the element is routed
// through createMediaElementSource, which silently breaks the speed control on
// mobile. On those browsers we skip the analyser entirely and synthesize the
// waveform; narration stays on the native audio path so 1.5x/2x work.
function isWebAudioHostile(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS =
    /iP(hone|ad|od)/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document)
  const safari = /^((?!chrome|crios|fxios|android).)*safari/i.test(ua)
  return iOS || safari
}

function getAnalyser(el: HTMLMediaElement): AnalyserNode | null {
  if (isWebAudioHostile()) return null
  const Ctx =
    typeof window !== 'undefined' &&
    (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext)
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  let analyser = analysers.get(el)
  if (!analyser) {
    try {
      const source = sharedCtx.createMediaElementSource(el)
      analyser = sharedCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyser.connect(sharedCtx.destination)
      analysers.set(el, analyser)
    } catch {
      return null
    }
  }
  return analyser
}

export function NarrationWaveform({
  audioRef,
  playing,
  className,
}: {
  audioRef: RefObject<HTMLAudioElement | null>
  playing: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sealRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx2d.scale(dpr, dpr)

    let raf = 0
    const el = audioRef.current
    const analyser = playing && el ? getAnalyser(el) : null
    if (analyser) sharedCtx?.resume().catch(() => {})
    const data = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : null

    const gap = W / BAR_COUNT
    const barW = Math.max(2, gap * 0.5)

    const draw = () => {
      ctx2d.clearRect(0, 0, W, H)
      let avg = 0
      if (analyser && data && playing) {
        analyser.getByteFrequencyData(data)
        avg =
          data.slice(0, BAR_COUNT).reduce((a, b) => a + b, 0) /
          (BAR_COUNT * 255)
      } else if (playing) {
        avg = 0.35
      }
      const t = performance.now() / 1000
      for (let i = 0; i < BAR_COUNT; i++) {
        // Voice energy lives in the low bins; spread them across the bars.
        // Without an analyser (iOS/Safari), synthesize a speech-like pattern.
        const v =
          analyser && data && playing
            ? data[Math.floor(i * 1.5)] / 255
            : playing
              ? 0.18 +
                0.6 *
                  Math.abs(
                    Math.sin(t * 2.4 + i * 1.7) * Math.sin(t * 5.3 + i * 0.9),
                  )
              : 0
        const h = Math.max(2, v * (H - 4))
        const x = i * gap + (gap - barW) / 2
        ctx2d.fillStyle = GOLD
        ctx2d.globalAlpha = playing ? 0.35 + v * 0.65 : 0.25
        const y = (H - h) / 2
        ctx2d.beginPath()
        ctx2d.roundRect(x, y, barW, h, barW / 2)
        ctx2d.fill()
      }
      ctx2d.globalAlpha = 1
      if (sealRef.current) {
        sealRef.current.style.opacity = playing
          ? String(0.55 + avg * 0.45)
          : '0.4'
        sealRef.current.style.transform = playing
          ? `scale(${1 + avg * 0.18})`
          : 'scale(1)'
      }
      if (playing) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [playing, audioRef])

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <svg
        ref={sealRef}
        viewBox="12 4 76 76"
        aria-hidden
        className="h-4 w-4 shrink-0 transition-transform duration-150"
        style={{ opacity: 0.4 }}
      >
        <path
          fill={GOLD}
          d="M50 8 C 51 32 57 37 78 38 C 57 39 51 49 50 75 C 49 49 43 39 22 38 C 43 37 49 32 50 8 Z"
        />
      </svg>
      <canvas ref={canvasRef} className="h-7 w-24" aria-hidden />
    </div>
  )
}
