export enum PlaybackState {
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  CONTINUE = 'CONTINUE',
}

export interface StoryImage {
  url: string;
  caption?: string;
}

export interface StorySection {
  /** Stable id. Doubles as the narration filename: /story-narration/<id>.mp3 */
  id: string;
  /** Small uppercase label rendered at the bottom of the chapter card. */
  title: string;
  /** Markdown body. Inline markdown is limited to bold, italic, and links. */
  content: string;
  /** Narration clip. Every section needs one or the whole toolbar hides. */
  audioUrl?: string;
  /** Single image below the text. Ignored when `images` has 2+ entries. */
  imageUrl?: string;
  imageCaption?: string;
  /** 2+ entries render as an auto-rotating carousel with caption + dots. */
  images?: StoryImage[];
  /** Optional inline video with controls. */
  videoUrl?: string;
  /** Optional glowing button under the text (external link). */
  callToAction?: {
    text: string;
    url: string;
  };
  /**
   * Verse mode: treat every paragraph after the first as a poem/scripture
   * block (bordered, serif, left-aligned). Use for a closing vow or poem.
   * Paragraphs that are entirely italic are auto-detected as verse even
   * without this flag.
   */
  poemAfterIntro?: boolean;
}
