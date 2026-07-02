'use client'

import { Fragment, type ReactNode } from 'react'
import type { SectionTimings } from '@/data/story-timings'

// Sentence-level rendering for narrated story sections. Each sentence is a
// clickable span; the sentence currently being read gets a soft gold
// highlight. The timing data (sentence markdown + start/end seconds) is
// produced at build time by scripts/generate-story-narration.ts.

// Minimal inline-markdown renderer for the story corpus: ***x***, **x**,
// *x*, [text](url). The corpus uses nothing else inside a sentence.
const INLINE_MD = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g

function renderInline(md: string): ReactNode[] {
  return md.split(INLINE_MD).map((chunk, i) => {
    if (!chunk) return null
    if (chunk.startsWith('***') && chunk.endsWith('***')) {
      return (
        <strong key={i}>
          <em>{chunk.slice(3, -3)}</em>
        </strong>
      )
    }
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return <strong key={i}>{chunk.slice(2, -2)}</strong>
    }
    if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2) {
      return <em key={i}>{chunk.slice(1, -1)}</em>
    }
    const link = chunk.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="!text-[#C2A15C] hover:!text-[#E3CD9C] !no-underline font-bold relative z-20 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {renderInline(link[1].replace(/\*/g, ''))}
        </a>
      )
    }
    return <Fragment key={i}>{chunk}</Fragment>
  })
}

// A paragraph reads as "verse" (poem / scripture / quoted lines) when every
// sentence is fully italic-wrapped, or when the section is flagged as a poem
// after its intro line. Verse runs are grouped into one bordered block so a
// quoted poem is visually separate from surrounding prose.
const FULLY_ITALIC = /^\*{1,3}[^*].*\*{1,3}$/

export function SentenceText({
  timings,
  activeSentence,
  onSentenceClick,
  poemAfterIntro = false,
}: {
  timings: SectionTimings
  /** Global sentence index (across paragraphs) currently being narrated, or -1. */
  activeSentence: number
  onSentenceClick: (sentenceIndex: number, startTime: number) => void
  /** Treat every paragraph after the first as verse (e.g. A Builder's Vow). */
  poemAfterIntro?: boolean
}) {
  let idx = -1

  const renderParagraph = (
    sentences: SectionTimings['paragraphs'][number],
    p: number,
    verse: boolean,
  ) => (
    <p key={p} className={verse ? 'my-3 first:mt-0 last:mb-0' : undefined}>
      {sentences.map((sentence) => {
        idx++
        const i = idx
        const active = i === activeSentence
        return (
          <Fragment key={i}>
            {' '}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onSentenceClick(i, sentence.start)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSentenceClick(i, sentence.start)
              }}
              className={`pointer-events-auto cursor-pointer rounded-sm box-decoration-clone px-0.5 transition-colors duration-300 ${
                active
                  ? 'bg-[rgba(194,161,92,0.16)] text-white'
                  : 'hover:bg-[rgba(194,161,92,0.07)]'
              }`}
            >
              {renderInline(sentence.md)}
            </span>
          </Fragment>
        )
      })}
    </p>
  )

  // Partition paragraphs into prose and runs of verse.
  const items: ReactNode[] = []
  let verseRun: ReactNode[] = []
  const flushVerse = (key: string) => {
    if (!verseRun.length) return
    items.push(
      <div
        key={key}
        className="mx-auto my-8 max-w-md border-l pl-6 text-left text-[1.1em] leading-relaxed"
        style={{
          borderColor: 'rgba(194,161,92,0.45)',
          fontFamily: 'var(--font-fraunces), Georgia, serif',
        }}
      >
        {verseRun}
      </div>,
    )
    verseRun = []
  }

  timings.paragraphs.forEach((sentences, p) => {
    const isVerse =
      (poemAfterIntro && p > 0) ||
      sentences.every((sen) => FULLY_ITALIC.test(sen.md.trim()))
    if (isVerse) {
      verseRun.push(renderParagraph(sentences, p, true))
    } else {
      flushVerse(`verse-${p}`)
      items.push(renderParagraph(sentences, p, false))
    }
  })
  flushVerse('verse-end')

  return <>{items}</>
}
