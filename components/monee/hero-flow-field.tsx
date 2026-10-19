'use client'

import { useEffect, useRef, useState } from 'react'

const regions = [
  { city: 'Kuala Lumpur', zone: 'Asia/Kuala_Lumpur' },
  { city: 'Singapore', zone: 'Asia/Singapore' },
  { city: 'Bangkok', zone: 'Asia/Bangkok' },
  { city: 'Mumbai', zone: 'Asia/Kolkata' },
  { city: 'Hong Kong', zone: 'Asia/Hong_Kong' },
  { city: 'Tokyo', zone: 'Asia/Tokyo' },
  { city: 'Seoul', zone: 'Asia/Seoul' },
  { city: 'Dubai', zone: 'Asia/Dubai' },
  { city: 'Istanbul', zone: 'Europe/Istanbul' },
  { city: 'Moscow', zone: 'Europe/Moscow' },
  { city: 'Paris', zone: 'Europe/Paris' },
  { city: 'Berlin', zone: 'Europe/Berlin' },
  { city: 'London', zone: 'Europe/London' },
  { city: 'New York', zone: 'America/New_York' },
  { city: 'Toronto', zone: 'America/Toronto' },
  { city: 'Chicago', zone: 'America/Chicago' },
  { city: 'Vancouver', zone: 'America/Vancouver' },
  { city: 'Los Angeles', zone: 'America/Los_Angeles' },
  { city: 'Honolulu', zone: 'Pacific/Honolulu' },
  { city: 'Sydney', zone: 'Australia/Sydney' },
  { city: 'Auckland', zone: 'Pacific/Auckland' },
]

/** A soft, pointer-responsive liquid-chrome clock for the homepage hero. */
export function HeroFlowField() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zone, setZone] = useState(regions[0].zone)
  const [now, setNow] = useState<Date | null>(null)
  const region = regions.find((item) => item.zone === zone) ?? regions[0]
  const clockHandsRef = useRef({ hour: 0, minute: 0, second: 0 })
  const clockParts = now ? new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now) : []
  const clockHour = Number(clockParts.find((part) => part.type === 'hour')?.value ?? 0) % 12
  const clockMinute = Number(clockParts.find((part) => part.type === 'minute')?.value ?? 0)
  const clockSecond = Number(clockParts.find((part) => part.type === 'second')?.value ?? 0)
  clockHandsRef.current = { hour: (clockHour + clockMinute / 60) / 12 * Math.PI * 2 - Math.PI / 2, minute: (clockMinute + clockSecond / 60) / 60 * Math.PI * 2 - Math.PI / 2, second: clockSecond / 60 * Math.PI * 2 - Math.PI / 2 }

  useEffect(() => {
    let timer: number | undefined
    const tick = () => {
      if (timer !== undefined) window.clearInterval(timer)
      setNow(new Date())
      timer = window.setInterval(() => {
        if (!document.hidden) setNow(new Date())
      }, 1000)
    }
    tick()
    document.addEventListener('visibilitychange', tick)
    return () => {
      if (timer !== undefined) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!host || !canvas || !ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let visible = true
    let pointer = { x: 0, y: 0, active: false }
    let rippleAt = -10_000
    const particles = Array.from({ length: 1450 }, (_, index) => {
      const seed = (index * 0.61803398875) % 1
      return { seed, v: ((index * 0.754877666) % 1) * Math.PI * 2, layer: index % 5, arm: index % 2 }
    })

    const draw = (time: number) => {
      if (!width || !height) return
      const t = reducedMotion.matches ? 0.4 : time * 0.00018
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      const cx = width * 0.52
      const cy = height * 0.47
      const scale = Math.min(width * 0.43, height * 0.43, 195)
      const tiltX = 0.27 + (pointer.active ? (pointer.y / height - 0.5) * 0.12 : 0)
      const tiltY = t * 0.58 + (pointer.active ? (pointer.x / width - 0.5) * 0.2 : 0)
      const clickAge = (time - rippleAt) / 1000

      for (const particle of particles) {
        const { v, seed, layer, arm } = particle
        const radius = 0.12 + seed * 0.8
        const angle = radius * 4.7 + arm * Math.PI + t * 0.12
        const spread = Math.sin(v) * (0.025 + seed * 0.035) + Math.cos(v * 2 + t) * 0.012
        const r = radius + spread
        let x = r * Math.cos(angle)
        let y = r * Math.sin(angle) * 0.72
        let z = 0.09 * Math.sin(angle * 1.7 + t) + Math.cos(v) * 0.055 + (layer - 2) * 0.009
        const oldX = x
        x = x * Math.cos(tiltY) - z * Math.sin(tiltY)
        z = oldX * Math.sin(tiltY) + z * Math.cos(tiltY)
        const oldY = y
        y = oldY * Math.cos(tiltX) - z * Math.sin(tiltX)
        z = oldY * Math.sin(tiltX) + z * Math.cos(tiltX)
        const perspective = 2.1 / (2.1 - z)
        let px = cx + x * scale * perspective
        let py = cy - y * scale * perspective

        if (pointer.active) {
          const dx = px - pointer.x
          const dy = py - pointer.y
          const distance = Math.hypot(dx, dy)
          if (distance > 0 && distance < 90) {
            const force = (1 - distance / 90) * 4.5
            px += dx / distance * force
            py += dy / distance * force
          }
        }
        if (clickAge >= 0 && clickAge < 0.8) {
          const ring = Math.exp(-Math.pow((Math.hypot(px - cx, py - cy) / scale - clickAge * 1.1) * 18, 2))
          px += Math.cos(angle + v) * ring * 7
          py += Math.sin(angle + v) * ring * 7
        }

        const depth = Math.max(0.15, Math.min(1, 0.56 + z * 0.9))
        const pulse = 0.72 + 0.16 * Math.sin(t * 8 + seed * 30)
        const radiusPx = (0.32 + (seed % 0.4) * 0.78) * (0.75 + depth * 0.35)
        const purple = Math.max(0, Math.sin(angle * 0.75 - t * 0.6))
        const red = Math.round(167 + depth * 35 + purple * 10)
        const green = Math.round(178 + depth * 38 + purple * 7)
        const blue = Math.round(196 + depth * 42 + purple * 20)
        ctx.fillStyle = `rgba(${red},${green},${blue},${(0.12 + depth * 0.24) * pulse})`
        ctx.beginPath()
        ctx.arc(px, py, radiusPx, 0, Math.PI * 2)
        ctx.fill()
      }

      // A fine clock ring and hands keep the visual useful without turning it into a dashboard.
      ctx.globalCompositeOperation = 'source-over'
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = 'rgba(208,201,244,0.28)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(0, 0, scale * 0.3, 0, Math.PI * 2)
      ctx.stroke()
      for (let tick = 0; tick < 12; tick += 1) {
        const angle = tick / 12 * Math.PI * 2 - Math.PI / 2
        const inner = scale * (tick % 3 === 0 ? 0.264 : 0.28)
        const outer = scale * 0.3
        ctx.strokeStyle = tick % 3 === 0 ? 'rgba(230,225,255,0.65)' : 'rgba(211,209,225,0.3)'
        ctx.lineWidth = tick % 3 === 0 ? 1.4 : 0.8
        ctx.beginPath()
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        ctx.stroke()
      }
      const hand = (angle: number, length: number, lineWidth: number, color: string) => {
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(-Math.cos(angle) * length * 0.15, -Math.sin(angle) * length * 0.15)
        ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length)
        ctx.stroke()
      }
      hand(clockHandsRef.current.hour, scale * 0.16, 2.6, 'rgba(243,240,234,0.82)')
      hand(clockHandsRef.current.minute, scale * 0.23, 1.5, 'rgba(205,194,255,0.9)')
        hand(clockHandsRef.current.second, scale * 0.25, 0.7, 'rgba(184,168,248,0.34)')
      ctx.fillStyle = '#d5cbff'
      ctx.beginPath()
      ctx.arc(0, 0, 2.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.globalCompositeOperation = 'source-over'
    }

    const animate = (time: number) => {
      frame = 0
      if (!visible || document.hidden) return
      draw(time)
      if (!reducedMotion.matches) frame = requestAnimationFrame(animate)
    }
    const start = () => {
      if (visible && !document.hidden && !reducedMotion.matches && !frame) frame = requestAnimationFrame(animate)
      else if (visible && !document.hidden && reducedMotion.matches) draw(performance.now())
    }
    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0 }
    const resize = () => {
      width = host.clientWidth
      height = host.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.6)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }
    const pointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: event.pointerType !== 'touch' }
    }
    const pointerLeave = () => { pointer.active = false }
    const pointerDown = () => { rippleAt = performance.now(); start() }
    const visibility = () => document.hidden ? stop() : start()
    const motionChange = () => { stop(); start() }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? start() : stop() })
    const resizeObserver = new ResizeObserver(resize)
    observer.observe(host)
    resizeObserver.observe(host)
    document.addEventListener('visibilitychange', visibility)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerleave', pointerLeave)
    canvas.addEventListener('pointerdown', pointerDown)
    reducedMotion.addEventListener('change', motionChange)
    resize()
    start()

    return () => {
      stop()
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('pointerdown', pointerDown)
      reducedMotion.removeEventListener('change', motionChange)
    }
  }, [])

  const time = now ? new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now) : '--:--:--'
  const date = now ? new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' }).format(now) : 'Local date'

  return (
    <div ref={hostRef} className="relative h-[290px] w-full overflow-hidden rounded-[2rem] sm:h-[350px] lg:h-[430px]" aria-label={`Interactive world clock for ${region.city}, ${region.zone}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_52%_48%,rgba(184,168,248,0.13),transparent_40%),radial-gradient(ellipse_at_54%_54%,rgba(145,166,193,0.09),transparent_65%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-pan-y" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#17191c_0%,transparent_17%,transparent_83%,#17191c_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#17191c_0%,transparent_12%,transparent_76%,#17191c_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-[210px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(23,25,28,0.92)_0%,rgba(23,25,28,0.62)_52%,transparent_76%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-[10px] font-medium tracking-[0.3em] text-muted-foreground">LOCAL TIME</p>
        <p className="mt-1 font-serif text-4xl tracking-[0.06em] text-foreground tabular-nums drop-shadow-[0_2px_16px_rgba(23,25,28,0.95)] sm:text-5xl lg:text-6xl">{time}</p>
        <p className="mt-1 text-sm font-medium text-lavender drop-shadow-[0_2px_12px_rgba(23,25,28,0.95)]">{region.city} · {date}</p>
      </div>
      <label className="absolute inset-x-5 bottom-4 z-20 flex items-center justify-between gap-4 sm:inset-x-8 sm:bottom-6">
        <span className="text-[9px] font-medium tracking-[0.25em] text-muted-foreground/80 sm:text-[10px]">WORLD CLOCK</span>
        <select aria-label="Choose clock location" value={zone} onChange={(event) => setZone(event.target.value)} className="pointer-events-auto max-w-[58%] rounded-full border border-foreground/10 bg-background/80 px-3 py-2 text-xs text-foreground outline-none backdrop-blur transition hover:border-lavender/40 focus-visible:ring-2 focus-visible:ring-lavender sm:text-sm">
          {regions.map((item) => <option key={item.zone} value={item.zone}>{item.city}</option>)}
        </select>
      </label>
    </div>
  )
}
