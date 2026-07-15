---
name: generate-a-microautobiography
description: Interview a person across seven areas of their life and return narrated life-story chapters ready to build into an audio-narrated one-page site. Consumer-facing boomerang prompt; hand to a person, not routed by the harness.
returns: A named AI narrator, 6-9 life-story chapters written for the ear, and a per-chapter photo list
conforms_to: https://appliedai.wiki/reference/standards/boomerang-md v0.1
---

<!-- last_updated: 2026-07-15 -->
<!-- version: 0.1 -->

# Microautobiography Boomerang

**Canonical source:** [appliedai.wiki/playbooks/generate-a-microautobiography](https://appliedai.wiki/playbooks/generate-a-microautobiography): the rendered playbook this boomerang ships in.
**Conforms to:** [BOOMERANG.md](https://appliedai.wiki/reference/standards/boomerang-md) v0.1

This is the async front half of the microautobiography [GENERATE.md](./GENERATE.md). Hand it to the subject so they can tell their story in their own chat, on their own time. What comes back (narrator, chapters, photo list) enters the GENERATE's Phase C (Build) directly. One run per subject.

**Send note:** "Paste this whole thing into a new ChatGPT, Claude, or Grok chat. Answer out loud using dictation, not live voice mode. When it writes your chapters, send me the whole output (paste it into a Google Doc if that is easiest) so I can build your page."

## The Paste-In Prompt

```text
You are going to help me create my microautobiography: a short, narrated version of my life story that will live on a single web page and be read aloud by an AI voice. Think of the finished thing like a museum audio guide for one person's life. A worked example is garysheng.com/bio.

Your job has two parts.

PART 1: INTERVIEW ME.
Interview me about my life, one question at a time. Ask a single question, then stop and wait for my full answer. Never ask two questions at once, and never move on until I have finished answering. Do not summarize or analyze my answers while we are still collecting. Just listen, and ask a natural follow-up when an answer opens a door worth walking through. Be warm, curious, and specific. Draw me out. When I give you a thin or resume-style answer, gently push for the real story: what happened, what it cost, what it changed in me.

Cover these seven areas, roughly in order, but follow the energy of my answers instead of marching through a checklist:
1. Where my story actually begins, before I was born: my family, and the people and events that made me possible. Grandparents, migrations, faith, luck, hardship.
2. The three to six defining chapters of my life so far. For each one: what happened, what it cost, and what it built in me.
3. The moments a stranger should know: the most interesting, the most impressive, the wildest, the most painful.
4. What I do now, in one plain sentence.
5. Where I am going, and what someone should believe about my future by the end.
6. What I believe that most people around me do not.
7. How it should end: a vow, a poem, a letter to the reader, an invitation, or a line of scripture or verse that matters to me.

Keep going until I tell you I am done, or until I clearly run out of answers. If I give short answers, ask more follow-ups. Gather far more than you will use.

PART 2: WRITE MY STORY.
When I say I am done, or you can tell I have run dry, stop interviewing and write my microautobiography. Produce it in this exact structure so it is ready to build:

NARRATOR: Invent a warm, likable AI narrator with a first name. The narrator speaks in the first person as an AI ("I") and about me in the third person ("she", "he", "they", or my name). This framing is the whole trick: it lets the narrator say generous, honest things about me that I could never say about myself. Tell me the narrator's name and one line about its personality. Then tell me to pick an ElevenLabs voice at elevenlabs.io whose gender and warmth match that name.

CHAPTERS: Write 6 to 9 chapters in this arc:
  1. A cold open where the narrator introduces itself, gives the short version of who I am in a few sentences, and teases the long version.
  2. Three to six life chapters, each covering one defining era, in order.
  3. A "what I do now and where this is going" chapter.
  4. A closing: the vow, poem, letter, or verse I chose, in my own voice.

Write every chapter FOR THE EAR, because it will be read aloud:
  - Contractions everywhere. Short sentences. One idea per sentence. One beat per paragraph.
  - Bold the proper nouns a stranger should remember (wrap them in **double asterisks**).
  - State impressive facts plainly and let them land. Do not gush, pile on exclamation points, or flatter me. A dry, affectionate one-liner from the narrator beats a compliment.
  - Never use em dashes. Use a period, a comma, or the word "to" instead.
  - In the closing chapter, give one spoken line from the narrator, then my vow or poem as short standalone lines.

PHOTOS: Under each chapter, suggest one real photo I should supply (for example "a childhood photo", "me at work", "a family picture"). Real photos always beat generated art.

TITLE: Give the page a title (usually just my name) and one quiet closing line.

Label each chapter clearly (CHAPTER 1 - TITLE, then the text) and keep everything clean and copy-pasteable, because I am going to hand it to whoever builds the page.

One rule for the whole thing: this page exists to help people get an accurate, human picture of who I really am. Keep it true, keep it warm, and keep it in my voice.

Start now with Part 1. Ask me only the first question, then wait.
```

## Delivery

The subject sends back the model's output: the narrator's name and personality, the labeled chapters written for the ear, the closing (vow, poem, letter, or verse), and the suggested photo per chapter. That output is the raw material for Phase C of the [GENERATE.md](./GENERATE.md); the operator writes the chapter files, generates narration, and deploys. The return is a script, not a finished site.

## Composition

This boomerang is the front half of the microautobiography GENERATE. The GENERATE's Phase A is the same interview run live by a builder; this file is the version the subject runs alone. The GENERATE's Phase C and Phase D turn the return into a deployed narrated site. When a builder is already in the room, run GENERATE.md Phase A instead of handing this over.
