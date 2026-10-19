'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function RouteScrollManager() {
  const pathname = usePathname()
  const previousPath = useRef(pathname)

  useEffect(() => {
    const pathChanged = previousPath.current !== pathname
    previousPath.current = pathname
    let frame = 0
    let attempts = 0
    let scrollTimer = 0
    let settleTimer = 0
    const scrollToTarget = (target: HTMLElement) => {
      const top = target.getBoundingClientRect().top + window.scrollY - 72
      window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'smooth' })
    }
    const scrollToLocation = () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(scrollTimer)
      window.clearTimeout(settleTimer)
      attempts = 0
      const pendingTarget = sessionStorage.getItem('monee:navigate-anchor')
      const id = decodeURIComponent(window.location.hash.slice(1) || pendingTarget || '')
      if (!id) {
        if (pathChanged) {
          sessionStorage.removeItem('monee:navigate-anchor')
          scrollTimer = window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 120)
        }
        return
      }
      const navigateScroll = () => {
        const target = document.getElementById(id)
        if (target) {
          sessionStorage.removeItem('monee:navigate-anchor')
          // Let Next finish its own route scroll restoration before applying the hash target.
          scrollTimer = window.setTimeout(() => scrollToTarget(target), pathChanged ? 140 : 0)
          settleTimer = window.setTimeout(() => scrollToTarget(target), pathChanged ? 360 : 180)
        }
        else if (attempts++ < 90) frame = window.requestAnimationFrame(navigateScroll)
      }
      frame = window.requestAnimationFrame(navigateScroll)
    }

    if (pathChanged || window.location.hash) scrollToLocation()
    window.addEventListener('hashchange', scrollToLocation)
    window.addEventListener('popstate', scrollToLocation)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(scrollTimer)
      window.clearTimeout(settleTimer)
      window.removeEventListener('hashchange', scrollToLocation)
      window.removeEventListener('popstate', scrollToLocation)
    }
  }, [pathname])

  return null
}
