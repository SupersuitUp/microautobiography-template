"use client"

import { forwardRef, useRef } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  UseInViewOptions,
  Variants,
  HTMLMotionProps,
  MotionProps
} from "framer-motion"

type MarginType = UseInViewOptions["margin"]

interface BlurFadeProps extends Omit<HTMLMotionProps<"div">, keyof {
  animate: MotionProps["animate"]
  initial: MotionProps["initial"]
  exit: MotionProps["exit"]
  variants: MotionProps["variants"]
  transition: MotionProps["transition"]
}> {
  children: React.ReactNode
  variant?: {
    hidden: { y: number }
    visible: { y: number }
  }
  duration?: number
  delay?: number
  yOffset?: number
  inView?: boolean
  inViewMargin?: MarginType
  blur?: string
}

export const BlurFade = forwardRef<HTMLDivElement, BlurFadeProps>(({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  ...props
}, forwardedRef) => {
  const localRef = useRef<HTMLDivElement>(null)
  const inViewRef = useRef<HTMLDivElement>(null)
  const combinedRef = (node: HTMLDivElement) => {
    // Update both refs
    if (typeof forwardedRef === 'function') {
      forwardedRef(node)
    } else if (forwardedRef) {
      forwardedRef.current = node
    }
    inViewRef.current = node
    if (localRef) localRef.current = node
  }

  const inViewResult = useInView(inViewRef, { once: true, margin: inViewMargin })
  const isInView = !inView || inViewResult
  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: `blur(0px)` },
  }
  const combinedVariants = variant || defaultVariants

  return (
    <AnimatePresence>
      <motion.div
        ref={combinedRef}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
})

BlurFade.displayName = "BlurFade" 