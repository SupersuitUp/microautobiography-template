'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, SkipBack, SkipForward, ExternalLink } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import { BlurFade } from '@/components/ui/blur-fade'
import { motion, AnimatePresence } from 'framer-motion'
import { GlowEffect } from '@/components/ui/glow-effect'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PlaybackState, StorySection } from '@/types'
import { STORY_SECTIONS } from '@/data/story-sections'
import { NarrationWaveform } from '@/components/ui/narration-waveform'
import { SentenceText } from '@/components/ui/sentence-text'
import { STORY_TIMINGS, flatSentences } from '@/data/story-timings'
import { useMediaQuery, useBackgroundMusic } from '@/hooks'

export interface StoryPlaybackProps {
  sections?: StorySection[];
}

export function StoryPlayback({ sections = STORY_SECTIONS }: StoryPlaybackProps) {
  // Audio playback UI is enabled only when every section has an audio clip.
  // If any section is missing audioUrl, the whole player goes silent: no toolbar,
  // no current-section highlight, no speaker cursor, no spacebar shortcut.
  const audioEnabled = sections.every(s => !!s.audioUrl)

  const isHoverDevice = useMediaQuery('(hover: hover)')
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.LOADING)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [displaySpeed, setDisplaySpeed] = useState(1) // Only for display purposes
  const playbackSpeedRef = useRef(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Sentence-level sync: index of the sentence being narrated in the current
  // section (per STORY_TIMINGS), and a seek to apply once new audio loads.
  const [activeSentence, setActiveSentence] = useState(-1)
  const pendingSeekRef = useRef<number | null>(null)
  // Music bed under the narration. Fades with play state. Ship your own
  // loop at public/story-music/bed.mp3 (see public/story-music/README.md).
  // If the file is missing, playback silently no-ops.
  useBackgroundMusic(
    '/story-music/bed.mp3',
    audioEnabled && playbackState === PlaybackState.PLAYING,
  )
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const shouldAutoplayRef = useRef(false)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null)
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({})

  // Image carousel auto-rotation
  useEffect(() => {
    const sectionsWithImages = sections.filter(s => s.images && s.images.length > 1)
    if (sectionsWithImages.length === 0) return

    const interval = setInterval(() => {
      setCarouselIndices(prev => {
        const next = { ...prev }
        sectionsWithImages.forEach(section => {
          const current = prev[section.id] || 0
          next[section.id] = (current + 1) % section.images!.length
        })
        return next
      })
    }, 6000)

    return () => clearInterval(interval)
  }, [sections])

  // Scroll handling
  const scrollToSection = useCallback((index: number) => {
    // Use setTimeout to ensure the scroll happens after state updates and DOM changes
    setTimeout(() => {
      const currentCard = cardRefs.current[index]
      if (currentCard) {
        const cardTop = currentCard.offsetTop
        const scrollTarget = cardTop - 50
        window.scrollTo({
          top: scrollTarget,
          behavior: 'smooth'
        })
      }
    }, 0)
  }, [])

  // Handle play/pause
  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current
    if (!isReady) return

    // Audioless slide: advance to next on play
    if (!audio) {
      if (currentSectionIndex < sections.length - 1) {
        shouldAutoplayRef.current = true
        setCurrentSectionIndex(prev => prev + 1)
      } else {
        setPlaybackState(PlaybackState.PAUSED)
        setIsEnded(true)
      }
      return
    }

    try {
      if (playbackState === PlaybackState.PLAYING) {
        audio.pause()
        setPlaybackState(PlaybackState.PAUSED)
      } else {
        if (isEnded) {
          window.scrollTo({ top: 0, behavior: 'smooth' })
          // Wait for scroll to complete before resetting state
          setTimeout(() => {
          shouldAutoplayRef.current = true
          setCurrentSectionIndex(0)
          setIsEnded(false)
          }, 1000)
          return
        }

        // If it's the first play, scroll to the first card
        if (currentSectionIndex === 0 && playbackState === PlaybackState.PAUSED && !audio.currentTime) {
          scrollToSection(0)
        }

        if (audio.ended) {
          audio.currentTime = 0
        }
        
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          setPlaybackState(PlaybackState.PLAYING)
          await playPromise
          audio.playbackRate = playbackSpeedRef.current
        } else {
          setPlaybackState(PlaybackState.PLAYING)
        }
      }
    } catch (error) {
      console.error('Playback failed:', error)
      setPlaybackState(PlaybackState.PAUSED)
    }
  }, [playbackState, isReady, isEnded, currentSectionIndex, sections.length, scrollToSection])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!audioEnabled) return

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle space when not typing in an input/textarea
      if (event.code === 'Space' &&
          event.target instanceof HTMLElement &&
          !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        event.preventDefault() // Prevent page scroll
        if (isReady && playbackState !== PlaybackState.LOADING) {
          togglePlayPause()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [audioEnabled, isReady, playbackState, togglePlayPause])

  // Handle section end
  const handleSectionEnd = useCallback(() => {
    if (currentSectionIndex < sections.length - 1) {
      shouldAutoplayRef.current = true
      setCurrentSectionIndex(prev => prev + 1)
    } else {
      setPlaybackState(PlaybackState.PAUSED)
      setIsEnded(true)
    }
  }, [currentSectionIndex, sections.length])

  // Initialize audio element
  useEffect(() => {
    // If audio is globally disabled (not every section has an audioUrl), skip
    // the entire audio pipeline. The story renders as a pure scroll-through.
    if (!audioEnabled) {
      audioRef.current = null
      return
    }

    setIsReady(false)
    setPlaybackState(PlaybackState.LOADING)
    setProgress(0)
    setIsEnded(false)
    setActiveSentence(-1)

    // If this section has no audio, skip audio init and mark as ready (text-only slide).
    // Don't auto-advance: with audio disabled, the user drives navigation via play/skip.
    const sectionAudio = sections[currentSectionIndex].audioUrl
    if (!sectionAudio) {
      audioRef.current = null
      setIsReady(true)
      setPlaybackState(PlaybackState.PAUSED)
      shouldAutoplayRef.current = false
      return
    }

    const audio = new Audio()

    const handleCanPlay = async () => {
      setIsReady(true)
      audio.playbackRate = playbackSpeedRef.current
      if (pendingSeekRef.current !== null) {
        audio.currentTime = pendingSeekRef.current
        pendingSeekRef.current = null
      }
      
      // If we should autoplay (coming from replay or section end)
      if (shouldAutoplayRef.current) {
        shouldAutoplayRef.current = false
        try {
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            setPlaybackState(PlaybackState.PLAYING)
            await playPromise
          } else {
            setPlaybackState(PlaybackState.PLAYING)
          }
        } catch (error) {
          console.error('Auto-play failed:', error)
          setPlaybackState(PlaybackState.PAUSED)
        }
      } else {
        // canplaythrough re-fires after seeks (e.g. sentence clicks); never
        // force PAUSED while the element is actually playing.
        setPlaybackState(
          audio.paused ? PlaybackState.PAUSED : PlaybackState.PLAYING,
        )
      }
    }

    // The element is the source of truth: keep React state in lockstep so
    // music and the waveform always track real playback.
    const handlePlay = () => setPlaybackState(PlaybackState.PLAYING)
    const handlePause = () => {
      if (!audio.ended) setPlaybackState(PlaybackState.PAUSED)
    }

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress(audio.currentTime / audio.duration)
      }
      const timings = STORY_TIMINGS[sections[currentSectionIndex].id]
      if (timings) {
        const t = audio.currentTime
        const flat = flatSentences(timings)
        let idx = -1
        for (let i = 0; i < flat.length; i++) {
          if (t >= flat[i].start - 0.15 && t <= flat[i].end + 0.35) idx = i
        }
        setActiveSentence(idx)
      }
    }

    const handleError = (e: ErrorEvent) => {
      console.error('Audio error:', e)
      setPlaybackState(PlaybackState.PAUSED)
      setIsReady(false)
    }

    // Set up audio element
    audio.src = sectionAudio
    audio.preload = 'auto'
    audio.currentTime = 0

    // Add event listeners
    audio.addEventListener('canplaythrough', handleCanPlay)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleSectionEnd)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('error', handleError)

    // Store reference and set initial playback speed
    audioRef.current = audio
    audio.playbackRate = playbackSpeedRef.current

    // Load the audio
    audio.load()

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleSectionEnd)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''
      audioRef.current = null
      setIsReady(false)
    }
  }, [currentSectionIndex, handleSectionEnd, sections, audioEnabled])

  // Handle speed change
  const toggleSpeed = useCallback(() => {
    const speeds = [1, 1.5, 2.0, 2.5]
    const currentIndex = speeds.indexOf(playbackSpeedRef.current)
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length]
    
    const audio = audioRef.current
    if (audio) {
      audio.playbackRate = nextSpeed
    }
    playbackSpeedRef.current = nextSpeed
    setDisplaySpeed(nextSpeed) // Update display state
  }, [])

  // Handle section change
  const jumpToSection = useCallback((index: number) => {
    const audio = audioRef.current
    if (audio) {
      // If clicking the current section while paused, resume playback
      if (index === currentSectionIndex && playbackState === PlaybackState.PAUSED) {
        togglePlayPause()
        return
      }

      // Otherwise, handle normal section change
      audio.pause()
      shouldAutoplayRef.current = true
      setProgress(0)
      setCurrentSectionIndex(index)
      setPlaybackState(PlaybackState.PAUSED)
      scrollToSection(index)
    }
  }, [currentSectionIndex, playbackState, togglePlayPause, scrollToSection])

  // Click a sentence: seek there (and play). Cross-section seeks stash the
  // target time until the new section's audio is ready.
  const seekToSentence = useCallback(
    (sectionIndex: number, startTime: number) => {
      if (!audioEnabled) return
      if (sectionIndex === currentSectionIndex && audioRef.current) {
        const audio = audioRef.current
        audio.currentTime = startTime
        if (playbackState !== PlaybackState.PLAYING) {
          audio
            .play()
            .then(() => setPlaybackState(PlaybackState.PLAYING))
            .catch(() => {})
        }
        setIsEnded(false)
      } else {
        pendingSeekRef.current = startTime
        const audio = audioRef.current
        if (audio) audio.pause()
        shouldAutoplayRef.current = true
        setProgress(0)
        setIsEnded(false)
        setCurrentSectionIndex(sectionIndex)
        setPlaybackState(PlaybackState.PAUSED)
        scrollToSection(sectionIndex)
      }
    },
    [audioEnabled, currentSectionIndex, playbackState, scrollToSection],
  )

  // Watch for section changes (for keyboard navigation or other changes)
  useEffect(() => {
    // Only scroll when component is ready AND it's not the initial load at index 0
    if (isReady && currentSectionIndex > 0) {
      scrollToSection(currentSectionIndex)
    }
  }, [currentSectionIndex, scrollToSection, isReady])

  // Calculate tilt based on mouse position
  const calculateTilt = useCallback((e: React.MouseEvent<HTMLDivElement>, cardElement: HTMLDivElement) => {
    const rect = cardElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate percentage position
    const xPercent = (x / rect.width) * 100
    const yPercent = (y / rect.height) * 100

    // Calculate tilt (max 2 degrees instead of 5)
    const tiltX = ((yPercent - 50) / 50) * -2
    const tiltY = ((xPercent - 50) / 50) * 2

    return { tiltX, tiltY }
  }, [])

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const card = cardRefs.current[index]
    if (!card) return

    const { tiltX, tiltY } = calculateTilt(e, card)
    setMousePosition({ x: tiltX, y: tiltY })
    setHoveredCardIndex(index)
  }, [calculateTilt])

  // Reset tilt when mouse leaves
  const handleMouseLeave = useCallback(() => {
    setMousePosition(null)
    setHoveredCardIndex(null)
  }, [])

  return (
    <div className="space-y-8">
      <div className={`space-y-8 ${audioEnabled ? 'pb-24' : ''}`}>
        {sections.map((section, index) => {
          const isActiveCard = audioEnabled && index === currentSectionIndex
          const cursorClass = !audioEnabled
            ? 'cursor-default'
            : isActiveCard && playbackState === PlaybackState.PLAYING
              ? '[cursor:url("/pause.svg"),pointer]'
              : '[cursor:url("/speaker.svg"),pointer]'

          return (
          <BlurFade
            key={section.id}
            ref={el => { cardRefs.current[index] = el }}
            className="block"
            delay={0.6 + (index * 0.15)}
            duration={0.8}
            yOffset={20}
            blur="8px"
            inViewMargin="-100px"
          >
            <Card
              className={`relative border-0 shadow-lg transition-all duration-300
              ${isActiveCard
                  ? 'scale-[1.02] shadow-[#C2A15C]/10 shadow-2xl'
                  : audioEnabled ? 'opacity-75 hover:opacity-90' : ''}
              ${cursorClass}`}
              onClick={audioEnabled ? (e) => {
                // Stop propagation to prevent event bubbling
                e.stopPropagation();
                jumpToSection(index);
              } : undefined}
              onMouseMove={isHoverDevice ? (e) => handleMouseMove(e, index) : undefined}
              onMouseLeave={isHoverDevice ? handleMouseLeave : undefined}
              style={{
                transform: hoveredCardIndex === index && mousePosition && isHoverDevice
                  ? `perspective(1000px) rotateX(${mousePosition.x}deg) rotateY(${mousePosition.y}deg)`
                  : 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
                transition: hoveredCardIndex === index ? 'transform 0.2s ease-out' : 'transform 0.4s ease-out'
              }}
          >
            {/* Background layer */}
            <div className={`absolute inset-0 rounded-lg border border-[#C2A15C]/15 transition-opacity duration-300
              ${isActiveCard
                ? '!bg-[#10121A]'
                : '!bg-[#10121A]/70'}`}
            />

            {/* Border effect layer */}
            <div className={`absolute inset-0 rounded-lg transition-all duration-300
              ${isActiveCard
                  ? 'border-2 border-[#C2A15C]/50 shadow-[0_0_18px_rgba(194,161,92,0.22)]'
                : ''}`}
            />
            
            {/* Content layer */}
              <CardContent className="relative pt-6 z-10 pointer-events-none">
                <div className="prose prose-lg dark:prose-invert max-w-none select-none pointer-events-auto">
                  <div className="mb-4 text-center !text-zinc-100">
                    {STORY_TIMINGS[section.id] ? (
                      <SentenceText
                        timings={STORY_TIMINGS[section.id]}
                        activeSentence={
                          index === currentSectionIndex ? activeSentence : -1
                        }
                        onSentenceClick={(_, startTime) =>
                          seekToSentence(index, startTime)
                        }
                        poemAfterIntro={!!section.poemAfterIntro}
                      />
                    ) : (
                    <ReactMarkdown
                      components={{
                        a: ({ ...props }) => (
                          <a
                            {...props}
                            className="!text-[#C2A15C] hover:!text-[#E3CD9C] !no-underline font-bold relative z-20 pointer-events-auto"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        ul: ({ ...props }) => (
                          <ul
                            {...props}
                            className="list-disc list-outside text-left max-w-xl mx-auto pl-6 my-4 space-y-2"
                          />
                        ),
                        li: ({ ...props }) => (
                          <li {...props} className="pl-1" />
                        )
                      }}
                    >
                    {section.content}
                  </ReactMarkdown>
                    )}
                </div>
                  {section.callToAction && (
                    <div className="mb-6 flex justify-center">
                      <a
                        href={section.callToAction.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto relative z-30 w-full max-w-xs"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.open(section.callToAction!.url, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        <GlowEffect
                          colors={['#C2A15C', '#8A6D35', '#EDEAE2', '#C2A15C']}
                          mode="colorShift"
                          blur="soft"
                          duration={4}
                          scale={0.95}
                        />
                        <Button
                          className="relative flex items-center justify-center text-center gap-3 rounded-xl bg-gradient-to-r from-[#8A6D35] to-[#6E5527] px-8 py-5 text-white font-semibold text-lg shadow-lg shadow-[#8A6D35]/30 @hover:hover:from-[#9A7B3E] @hover:hover:to-[#7C6030] @hover:hover:shadow-[#C2A15C]/40 transition-all duration-300 @hover:hover:scale-[1.02] w-full h-auto whitespace-normal border border-[#C2A15C]/20"
                        >
                          <span className="flex-grow">{section.callToAction.text}</span>
                          <ExternalLink className="w-5 h-5 shrink-0" />
                        </Button>
                      </a>
                    </div>
                  )}
                  {section.images && section.images.length > 1 ? (
                    <div className="mt-6 mb-8 flex flex-col items-center">
                      <div className="relative w-full max-w-[800px] overflow-hidden rounded-lg" style={{ minHeight: '300px' }}>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={carouselIndices[section.id] || 0}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                          >
                            <Image
                              src={section.images[carouselIndices[section.id] || 0].url}
                              alt={section.images[carouselIndices[section.id] || 0].caption || section.title}
                              width={800}
                              height={600}
                              className="rounded-lg max-h-[400px] min-w-[300px] sm:min-w-[500px] w-full object-contain select-none pointer-events-none"
                              style={{ borderRadius: '0.5rem' }}
                            />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <p className="text-xs text-zinc-400 italic text-center select-none">
                          {section.images[carouselIndices[section.id] || 0].caption}
                        </p>
                        <div className="flex gap-1.5 mt-1">
                          {section.images.map((_, imgIdx) => (
                            <div
                              key={imgIdx}
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                (carouselIndices[section.id] || 0) === imgIdx
                                  ? 'bg-[#C2A15C] scale-125'
                                  : 'bg-zinc-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : section.imageUrl ? (
                    <div className="mt-6 mb-8 flex flex-col items-center">
                      <Image
                        src={section.imageUrl}
                        alt={section.imageCaption || section.title}
                        width={800}
                        height={600}
                        className="rounded-lg max-h-[400px] min-w-[300px] sm:min-w-[500px] w-full object-contain select-none pointer-events-none"
                        style={{ borderRadius: '0.5rem' }}
                      />
                      {section.imageCaption && (
                        <p className="mt-2 text-xs text-zinc-400 italic text-center select-none">
                          {section.imageCaption}
                        </p>
                      )}
                    </div>
                  ) : null}
                  {section.videoUrl && (
                    <div className="mt-6 mb-6 flex justify-center">
                      <video
                        src={section.videoUrl}
                        controls
                        className="rounded-lg shadow-lg max-h-[400px] w-auto"
                        playsInline
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-[11px] font-medium uppercase tracking-[0.3em] select-none text-[#C2A15C]">
                    {section.title}
                  </span>
              </div>
            </CardContent>
          </Card>
          </BlurFade>
          )
        })}
      </div>

      {audioEnabled && (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="max-w-screen-xl mx-auto p-4">
          <div className="w-full bg-[#C2A15C]/15 h-1 rounded-full mb-4">
            <div className="relative w-full h-full">
              {/* Overall progress bar */}
              <div 
                className="absolute inset-y-0 left-0 bg-[#C2A15C]/40 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((currentSectionIndex) / sections.length) * 100}%` 
                }}
              />
              {/* Current section progress bar */}
              <div 
                className="absolute inset-y-0 left-0 bg-[#C2A15C] rounded-full transition-all duration-100"
                style={{ 
                  width: `${((currentSectionIndex + progress) / sections.length) * 100}%`
                }}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="hidden sm:block w-24 text-sm text-muted-foreground">
              {currentSectionIndex + 1} of {sections.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => jumpToSection(Math.max(0, currentSectionIndex - 1))}
                size="sm"
                variant="outline"
                className="text-xs @hover:hover:bg-accent @hover:hover:text-accent-foreground active:opacity-100"
                disabled={currentSectionIndex === 0 || !isReady || playbackState === PlaybackState.LOADING}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={togglePlayPause}
                      disabled={!isReady || playbackState === PlaybackState.LOADING}
                      size="lg"
                      className="w-32 min-w-[128px] bg-[#8A6D35] @hover:hover:bg-[#9A7B3E] active:bg-[#8A6D35] text-white group relative active:opacity-100"
                    >
                      {(() => {
                        if (!isReady || playbackState === PlaybackState.LOADING) {
                          return <span className="select-none">Loading...</span>
                        }
                        if (isEnded) {
                          return <span className="select-none">Replay</span>
                        }
                        return (
                          <>
                            <div className="relative h-6">
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={playbackState === PlaybackState.PLAYING ? 'pause' : 'play'}
                                  initial={{ opacity: 0, position: 'absolute', width: '100%', height: '100%' }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="flex items-center justify-center inset-0 select-none"
                                >
                                  {playbackState === PlaybackState.PLAYING 
                                    ? <><Pause className="mr-2 h-4 w-4" /> Pause</>
                                    : <><Play className="mr-2 h-4 w-4" /> {currentSectionIndex > 0 ? 'Continue' : 'Play'}</>}
                                </motion.div>
                              </AnimatePresence>
                            </div>
                          </>
                        )
                      })()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="hidden md:block">
                    Press space to {isEnded ? 'replay' : playbackState === PlaybackState.PLAYING ? 'pause' : currentSectionIndex > 0 ? 'continue' : 'play'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                onClick={() => jumpToSection(Math.min(sections.length - 1, currentSectionIndex + 1))}
                size="sm"
                variant="outline"
                className="text-xs @hover:hover:bg-accent @hover:hover:text-accent-foreground active:opacity-100"
                disabled={currentSectionIndex === sections.length - 1 || !isReady ||
                  playbackState === PlaybackState.LOADING ||
                  (currentSectionIndex === 0 && playbackState === PlaybackState.PAUSED && !audioRef.current?.currentTime)}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                onClick={toggleSpeed}
                size="sm"
                variant="outline"
                className="text-xs font-mono min-w-[56px] w-[56px] select-none @hover:hover:bg-accent @hover:hover:text-accent-foreground active:opacity-100"
                disabled={!isReady || playbackState === PlaybackState.LOADING}
              >
                {displaySpeed}x
              </Button>
            </div>
            <div className="sm:hidden text-sm text-muted-foreground">
              {currentSectionIndex + 1} of {sections.length}
            </div>
            <div className="hidden w-24 sm:flex sm:justify-end">
              <NarrationWaveform
                audioRef={audioRef}
                playing={playbackState === PlaybackState.PLAYING}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}