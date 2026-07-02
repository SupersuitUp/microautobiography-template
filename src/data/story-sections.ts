import type { StorySection } from '../types'

// ---------------------------------------------------------------------------
// THE STORY LIVES HERE.
//
// Each entry is one chapter card on the page. The reference implementation
// (garysheng.com/bio) runs about ten chapters; three placeholders below show
// the standard arc: a cold open from the narrator, a life chapter, and a
// closing chapter with a verse block.
//
// FIELD GUIDE (see src/types/index.ts for the full type):
//
//   id           Stable slug. The narration MP3 is written to
//                public/story-narration/<id>.mp3 by the generation script,
//                so audioUrl below should always be '/story-narration/<id>.mp3'.
//   title        Small uppercase label at the bottom of the card.
//   content      Markdown. Write for the ear: contractions, short sentences,
//                one beat per paragraph. Inline markdown is limited to
//                **bold**, *italic*, ***bold italic***, and [links](https://...).
//                Paragraphs that are ENTIRELY italic render as a verse block
//                (bordered, serif) - use that for scripture or quoted poems.
//   audioUrl     Required for playback. If ANY section is missing audioUrl,
//                the entire toolbar hides and the page becomes scroll-only.
//   imageUrl     One image under the text. imageCaption is its caption.
//   images       2+ entries become an auto-rotating carousel (6s per slide)
//                with per-image captions and dot indicators. When present
//                with 2+ entries, it wins over imageUrl.
//                Disclosure rule: fully AI-generated art should be captioned
//                "An imagining of ..." - real photos beat generated ones.
//   videoUrl     Optional inline video with controls.
//   callToAction Optional glowing external-link button under the text.
//   poemAfterIntro
//                Verse mode: every paragraph AFTER the first is rendered as
//                one verse block. Use for a closing vow or poem where only
//                the first paragraph is spoken prose.
//
// IMPORTANT: any edit to `content` requires regenerating that chapter's audio
// (sentence highlighting is synced to the exact spoken text):
//   npx tsx scripts/generate-story-narration.ts --only <id>
// ---------------------------------------------------------------------------

// Bump when the story content meaningfully changes. Shown under the title.
export const STORY_LAST_UPDATED = '{{MONTH YEAR}}'

export const STORY_SECTIONS: StorySection[] = [
  {
    // CHAPTER 1 - THE COLD OPEN.
    // The narrator introduces themselves, explains why an AI is telling this
    // story, gives the short version, and teases the long one.
    id: 'cold-open',
    title: 'Cold Open',
    content: `Hey there! You can call me **{{NARRATOR NAME}}**.\n\n{{ONE OR TWO SENTENCES: why this AI narrator is the one telling the story, and how it knows the subject.}}\n\nThe short version: {{THE SUBJECT'S LIFE IN TWO OR THREE SENTENCES.}}\n\nThe long version is better. It begins {{WHERE THE STORY ACTUALLY BEGINS}}.`,
    audioUrl: '/story-narration/cold-open.mp3',
    // A 2+ image array renders as a carousel. Replace these neutral
    // placeholders in public/story-images/ with real photos.
    images: [
      {
        url: '/story-images/placeholder-1.png',
        caption: '{{CAPTION FOR PHOTO ONE}}',
      },
      {
        url: '/story-images/placeholder-2.png',
        caption: '{{CAPTION FOR PHOTO TWO}}',
      },
    ],
  },
  {
    // CHAPTER 2 - A LIFE CHAPTER.
    // One defining era: what happened, what it cost, what it built.
    id: 'chapter-one',
    title: '{{CHAPTER TITLE}}',
    content: `{{OPENING BEAT: set the scene in one short paragraph. Bold the **proper nouns** a stranger should remember.}}

{{MIDDLE BEAT: what happened and what it cost. Keep sentences short. One idea per sentence reads best aloud.}}

{{CLOSING BEAT: what it built. A dry one-liner from the narrator lands well here.}}`,
    audioUrl: '/story-narration/chapter-one.mp3',
    // Single-image variant:
    imageUrl: '/story-images/placeholder-1.png',
    imageCaption: '{{CAPTION. If AI-generated: "An imagining of ..."}}',
    // Optional external-link button:
    // callToAction: { text: '{{BUTTON LABEL}}', url: 'https://example.com' },
  },
  {
    // CHAPTER 3 - THE CLOSE.
    // End with a vow, a poem, a letter, or an invitation. poemAfterIntro
    // renders every paragraph after the first as one bordered verse block.
    id: 'closing',
    title: '{{CLOSING TITLE, e.g. A Vow}}',
    content: `{{ONE SPOKEN INTRO LINE FROM THE NARRATOR, e.g. "I'll let the subject take it from here."}}

{{FIRST LINE OF THE VOW OR POEM.}}

{{SECOND LINE.}}

{{FINAL LINE. Make it land.}}`,
    audioUrl: '/story-narration/closing.mp3',
    poemAfterIntro: true,
  },
]
