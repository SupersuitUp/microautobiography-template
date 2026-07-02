'use client'

import { useState, useEffect } from 'react'

/**
 * True while the user is scrolling up and is at least `minOffset` px down the
 * page. Used for floating chrome (back buttons) that should stay out of the
 * way while reading downward but appear the moment the reader heads back up.
 */
export function useShowOnScrollUp(minOffset = 300): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setShow(y < lastY && y > minOffset)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [minOffset])

  return show
}
