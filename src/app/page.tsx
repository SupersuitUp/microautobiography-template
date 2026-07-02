'use client'

import { StoryPlayback } from '@/components/story-playback'
import { ErrorBoundary } from '@/components/error-boundary'
import { BlurFade } from '@/components/ui/blur-fade'
import { STORY_LAST_UPDATED } from '@/data/story-sections'

// The page shell reads the letterhead tokens from globals.css.
// Swap the tokens there ("swap for your brand") and this page follows.
const GROUND = 'var(--ground)'
const INK_TEXT = 'var(--ink-text)'
const ACCENT = 'var(--accent)'
const HAIRLINE = 'var(--hairline)'
const SERIF = 'var(--font-fraunces), Georgia, serif'

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: GROUND, color: INK_TEXT }}
    >
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-14 mt-10 text-center">
          <BlurFade delay={0.12}>
            <p
              className="text-[11px] font-medium uppercase tracking-[0.3em]"
              style={{ color: ACCENT }}
            >
              An Agentic Microautobiography
            </p>
            <h1
              className="mt-4 text-4xl tracking-tight sm:text-5xl"
              style={{ fontFamily: SERIF, fontWeight: 500 }}
            >
              {'{{PAGE TITLE, e.g. How I got here}}'}
            </h1>
          </BlurFade>
          <BlurFade delay={0.24}>
            <div
              className="mx-auto mt-8 h-px w-24"
              style={{ backgroundColor: HAIRLINE }}
            />
            <p className="mt-4 text-xs text-zinc-500">
              Last updated {STORY_LAST_UPDATED}
            </p>
          </BlurFade>
        </div>

        <ErrorBoundary
          fallback={
            <p className="p-8 text-center text-zinc-400">
              Story player failed to load. Please refresh.
            </p>
          }
        >
          <StoryPlayback />
        </ErrorBoundary>

        {/* Quiet close */}
        <BlurFade delay={0.2}>
          <div className="mt-20 mb-8">
            <div className="h-px w-full" style={{ backgroundColor: HAIRLINE }} />
            <p
              className="mt-8 text-center text-lg"
              style={{ fontFamily: SERIF, fontWeight: 340 }}
            >
              {'{{A QUIET CLOSING LINE}}'}
            </p>
          </div>
        </BlurFade>

        {/* Padding above fixed playback controls */}
        <div className="h-40" />
      </div>
    </div>
  )
}
