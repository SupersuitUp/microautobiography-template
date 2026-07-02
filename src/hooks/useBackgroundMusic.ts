'use client'

import { useEffect, useRef } from 'react'

// Background music bed for narrated pages. Routed through Web Audio so gain
// control works on iOS Safari (which ignores HTMLMediaElement.volume).
// Lazy-initialized on first activation so the AudioContext is created inside
// a user gesture and no bytes load until the listener presses play.

const BED_GAIN = 0.14
const FADE_SECONDS = 1.8

export function useBackgroundMusic(src: string, active: boolean) {
  const elRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Never initialize until the first time the story actually plays.
    if (!active && !elRef.current) return

    if (!elRef.current) {
      const el = new Audio(src)
      el.loop = true
      el.preload = 'auto'
      elRef.current = el

      const Ctx =
        typeof window !== 'undefined' &&
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
      if (Ctx) {
        const ctx = new Ctx()
        const source = ctx.createMediaElementSource(el)
        const gain = ctx.createGain()
        gain.gain.value = 0
        source.connect(gain)
        gain.connect(ctx.destination)
        ctxRef.current = ctx
        gainRef.current = gain
      } else {
        // Environments without Web Audio (tests): plain volume fallback.
        el.volume = BED_GAIN
      }
    }

    const el = elRef.current
    const ctx = ctxRef.current
    const gain = gainRef.current
    if (pauseTimer.current) {
      clearTimeout(pauseTimer.current)
      pauseTimer.current = null
    }

    if (active) {
      ctx?.resume().catch(() => {})
      el.play().catch(() => {})
      if (ctx && gain) {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(
          BED_GAIN,
          ctx.currentTime + FADE_SECONDS,
        )
      }
    } else {
      if (ctx && gain) {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_SECONDS)
        pauseTimer.current = setTimeout(
          () => el.pause(),
          FADE_SECONDS * 1000 + 100,
        )
      } else {
        el.pause()
      }
    }
  }, [active, src])

  useEffect(
    () => () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current)
      elRef.current?.pause()
      ctxRef.current?.close().catch(() => {})
    },
    [],
  )
}
