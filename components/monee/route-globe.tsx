'use client'

import { useEffect, useRef } from 'react'
import { geoGraticule, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import landTopology from 'world-atlas/land-110m.json'
import { formatFxRate } from '@/lib/fx'

const topology = landTopology as unknown as Topology
const land = feature(topology, topology.objects.land as GeometryCollection)
const graticule = geoGraticule().step([15, 15])()

const MINT = '#85d6b1'
const CORAL = '#e58a87'
const LAVENDER = '#B8A8F8'
const GLOBE_SCALE = 0.78
const STEER_SPEED = 46
const STEER_DEADZONE = 0.2
const STEER_RANGE = 1.6
const MAX_TILT = 55
const RECENTRE_AFTER_MS = 5000

export interface RouteEnd {
  /** Currency code shown on the globe. */
  code: string
  /** Country name shown on the globe. */
  name: string
  lon: number
  lat: number
}

interface View {
  lon: number
  lat: number
}

interface Pointer {
  x: number
  y: number
  type: string
}

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

function midpoint(from: RouteEnd, to: RouteEnd): View {
  const [lon, lat] = geoInterpolate([from.lon, from.lat], [to.lon, to.lat])(0.5)
  return { lon, lat: clamp(lat, -40, MAX_TILT) }
}

const ORBITS = [
  { rx: 1.3, ry: 0.36, rotation: -0.38, speed: 0.00016, phase: 0.6 },
  { rx: 1.18, ry: 0.5, rotation: 0.62, speed: -0.00011, phase: 3.4 },
]

function orbitPoint(
  orbit: (typeof ORBITS)[number],
  angle: number,
  cx: number,
  cy: number,
  radius: number,
) {
  const x = radius * orbit.rx * Math.cos(angle)
  const y = radius * orbit.ry * Math.sin(angle)
  const cos = Math.cos(orbit.rotation)
  const sin = Math.sin(orbit.rotation)
  return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos }
}

function draw(
  canvas: HTMLCanvasElement,
  view: View,
  route: { from: RouteEnd; to: RouteEnd; rate: number; shift: number },
  now: number,
  reducedMotion: boolean,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2
  const radius = (Math.min(width, height) / 2) * GLOBE_SCALE
  const t = reducedMotion ? 0 : now

  const projection = geoOrthographic()
    .scale(radius)
    .translate([cx, cy])
    .clipAngle(90)
    .rotate([-view.lon, -view.lat, 6])
  const path = geoPath(projection, ctx)

  const strokeOrbit = (orbit: (typeof ORBITS)[number], from: number, to: number) => {
    ctx.beginPath()
    ctx.ellipse(cx, cy, radius * orbit.rx, radius * orbit.ry, orbit.rotation, from, to)
    ctx.strokeStyle = 'rgba(184, 168, 248, 0.17)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  const orbitDot = (orbit: (typeof ORBITS)[number], front: boolean) => {
    const angle = orbit.phase + t * orbit.speed
    if ((Math.sin(angle) >= 0) !== front) return
    const point = orbitPoint(orbit, angle, cx, cy, radius)
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 9)
    glow.addColorStop(0, 'rgba(184, 168, 248, 0.55)')
    glow.addColorStop(1, 'rgba(184, 168, 248, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(point.x, point.y, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = LAVENDER
    ctx.beginPath()
    ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const orbit of ORBITS) {
    strokeOrbit(orbit, Math.PI, Math.PI * 2)
    orbitDot(orbit, false)
  }

  const body = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius)
  body.addColorStop(0, '#2d3139')
  body.addColorStop(0.55, '#1d2025')
  body.addColorStop(1, '#131518')
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  ctx.beginPath()
  path(graticule)
  ctx.strokeStyle = 'rgba(243, 240, 234, 0.075)'
  ctx.lineWidth = 0.7
  ctx.stroke()

  ctx.beginPath()
  path(land)
  ctx.fillStyle = 'rgba(184, 168, 248, 0.09)'
  ctx.fill()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(184, 168, 248, 0.16)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.strokeStyle = 'rgba(226, 219, 255, 0.72)'
  ctx.lineWidth = 0.8
  ctx.stroke()

  // Route arc, lifted off the surface
  const { from, to } = route
  const sameSpot = from.lon === to.lon && from.lat === to.lat
  const interpolate = geoInterpolate([from.lon, from.lat], [to.lon, to.lat])
  const lifted = (progress: number) => {
    const projected = projection(interpolate(progress))
    if (!projected) return null
    const lift = 1 + 0.16 * Math.sin(Math.PI * progress)
    return { x: cx + (projected[0] - cx) * lift, y: cy + (projected[1] - cy) * lift }
  }

  if (!sameSpot) {
    const routeMint = route.shift < -0.05 ? CORAL : MINT
    const routeGlow = route.shift < -0.05 ? 'rgba(229, 138, 135, 0.16)' : 'rgba(133, 214, 177, 0.14)'
    const trace = () => {
      ctx.beginPath()
      let drawing = false
      for (let i = 0; i <= 80; i++) {
        const point = lifted(i / 80)
        if (!point) {
          drawing = false
          continue
        }
        if (drawing) ctx.lineTo(point.x, point.y)
        else ctx.moveTo(point.x, point.y)
        drawing = true
      }
    }
    trace()
    ctx.strokeStyle = routeGlow
    ctx.lineWidth = 6
    ctx.stroke()
    trace()
    ctx.strokeStyle = routeMint
    ctx.lineWidth = 1.4
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = -(t / 55)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0

    const packet = lifted(reducedMotion ? 0.5 : (t / 2600) % 1)
    if (packet) {
      ctx.fillStyle = '#F3F0EA'
      ctx.beginPath()
      ctx.arc(packet.x, packet.y, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Lighting
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  const shade = ctx.createRadialGradient(
    cx - radius * 0.45,
    cy - radius * 0.5,
    radius * 0.2,
    cx + radius * 0.15,
    cy + radius * 0.2,
    radius * 1.15,
  )
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.07)')
  shade.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  shade.addColorStop(1, 'rgba(8, 9, 11, 0.62)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, radius - 0.5, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(184, 168, 248, 0.32)'
  ctx.lineWidth = 1
  ctx.stroke()

  for (const orbit of ORBITS) {
    strokeOrbit(orbit, 0, Math.PI)
    orbitDot(orbit, true)
  }

  // Endpoints and labels
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  const placed: Rect[] = []

  const pill = (anchor: { x: number; y: number }, text: string, color: string, centered: boolean) => {
    const textWidth = ctx.measureText(text).width
    const w = textWidth + 14
    const h = 20
    const candidates = centered
      ? [{ x: anchor.x - w / 2, y: anchor.y - h - 6 }]
      : [
          { x: anchor.x + 9, y: anchor.y - h - 4 },
          { x: anchor.x + 9, y: anchor.y + 6 },
          { x: anchor.x - w - 9, y: anchor.y - h - 4 },
          { x: anchor.x - w - 9, y: anchor.y + 6 },
        ]
    let chosen = candidates[0]
    for (const candidate of candidates) {
      const rect = { x0: candidate.x, y0: candidate.y, x1: candidate.x + w, y1: candidate.y + h }
      if (!placed.some((other) => overlaps(rect, other))) {
        chosen = candidate
        break
      }
    }
    const x = clamp(chosen.x, 4, width - w - 4)
    const y = clamp(chosen.y, 4, height - h - 4)
    placed.push({ x0: x, y0: y, x1: x + w, y1: y + h })
    ctx.fillStyle = 'rgba(19, 21, 24, 0.9)'
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(243, 240, 234, 0.16)'
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.fillStyle = color
    ctx.fillText(text, x + 7, y + h / 2 + 0.5)
  }

  const marker = (end: RouteEnd, color: string, ring: string) => {
    const projected = projection([end.lon, end.lat])
    if (!projected) return null
    const point = { x: projected[0], y: projected[1] }
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 18)
    glow.addColorStop(0, ring)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(point.x, point.y, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(point.x, point.y, 6.5, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(point.x, point.y, 3.4, 0, Math.PI * 2)
    ctx.fill()
    return point
  }

  const fromPoint = marker(from, LAVENDER, 'rgba(184, 168, 248, 0.5)')
  const toPoint = sameSpot ? null : marker(to, MINT, 'rgba(133, 214, 177, 0.5)')
  if (fromPoint) pill(fromPoint, sameSpot ? `${from.code} · ${from.name}` : `${from.code} · ${from.name}`, LAVENDER, false)
  if (toPoint) pill(toPoint, `${to.code} · ${to.name}`, MINT, false)

  if (!sameSpot) {
    const mid = lifted(0.5)
    const rateColor =
      route.shift > 0.05 ? MINT : route.shift < -0.05 ? CORAL : 'rgba(243, 240, 234, 0.95)'
    if (mid) pill(mid, `1 ${from.code} = ${formatFxRate(route.rate)} ${to.code}`, rateColor, true)
  }
}

export function RouteGlobe({
  from,
  to,
  rate,
  shift = 0,
  recenterKey,
  ariaLabel,
}: {
  from: RouteEnd
  to: RouteEnd
  rate: number
  shift?: number
  recenterKey: number
  ariaLabel: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const routeRef = useRef({ from, to, rate, shift })
  const stateRef = useRef({
    lon: midpoint(from, to).lon,
    lat: midpoint(from, to).lat,
    velocity: 0,
    focus: null as View | null,
    pointer: null as Pointer | null,
    dragging: false,
    lastInteraction: 0,
  })
  const firstRoute = useRef(true)

  useEffect(() => {
    routeRef.current = { from, to, rate, shift }
  })

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    stateRef.current.focus = midpoint(from, to)
    stateRef.current.velocity = 0
  }, [from.lon, from.lat, to.lon, to.lat, from, to])

  useEffect(() => {
    if (recenterKey === 0) return
    stateRef.current.focus = midpoint(routeRef.current.from, routeRef.current.to)
    stateRef.current.velocity = 0
  }, [recenterKey])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = stateRef.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = 0
    let visible = true
    const drag = { x: 0, y: 0, lastTime: 0 }

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0
      last = now

      const rect = canvas.getBoundingClientRect()
      const radius = Math.min(rect.width, rect.height) / 2
      const pointer = state.pointer
      const usesMouse = pointer !== null && pointer.type !== 'touch'
      let nx = 0
      let ny = 0
      let inRange = false
      if (pointer && radius > 0) {
        nx = (pointer.x - (rect.left + rect.width / 2)) / radius
        ny = (pointer.y - (rect.top + rect.height / 2)) / radius
        inRange = Math.hypot(nx, ny) <= STEER_RANGE
      }

      if (!state.dragging) {
        if (state.focus) {
          const dLon = wrap(state.focus.lon - state.lon)
          const dLat = state.focus.lat - state.lat
          if (reducedMotion) {
            state.lon = state.focus.lon
            state.lat = state.focus.lat
            state.focus = null
          } else {
            const ease = 1 - Math.exp(-dt * 5)
            state.lon += dLon * ease
            state.lat += dLat * ease
            if (Math.abs(dLon) < 0.2 && Math.abs(dLat) < 0.2) state.focus = null
          }
          state.velocity = 0
        } else if (!reducedMotion && usesMouse && inRange) {
          const sx = clamp(nx, -1.4, 1.4)
          const magnitude = Math.max(0, Math.abs(sx) - STEER_DEADZONE) / (1 - STEER_DEADZONE)
          const lonRate = Math.sign(sx) * magnitude * STEER_SPEED
          const latTarget = clamp(14 - clamp(ny, -1.4, 1.4) * 38, -MAX_TILT, MAX_TILT)
          state.lon += (lonRate + state.velocity) * dt
          state.velocity *= Math.exp(-dt * 3)
          state.lat += (latTarget - state.lat) * (1 - Math.exp(-dt * 4))
          state.lastInteraction = now
        } else {
          state.lon += state.velocity * dt
          state.velocity *= Math.exp(-dt * 3)
          if (!reducedMotion && now - state.lastInteraction > RECENTRE_AFTER_MS) {
            state.focus = midpoint(routeRef.current.from, routeRef.current.to)
          }
        }
        state.lon = wrap(state.lon)
      }

      canvas.style.cursor = state.dragging ? 'grabbing' : 'grab'
      draw(canvas, state, routeRef.current, now, reducedMotion)
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (frame) return
      last = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      state.dragging = true
      state.focus = null
      state.velocity = 0
      state.pointer = { x: event.clientX, y: event.clientY, type: event.pointerType }
      drag.x = event.clientX
      drag.y = event.clientY
      drag.lastTime = event.timeStamp
      canvas.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      state.pointer = { x: event.clientX, y: event.clientY, type: event.pointerType }
      if (!state.dragging) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      state.lon = wrap(state.lon - dx * 0.35)
      if (event.pointerType !== 'touch') state.lat = clamp(state.lat + dy * 0.3, -MAX_TILT, MAX_TILT)
      const elapsed = Math.max((event.timeStamp - drag.lastTime) / 1000, 0.008)
      state.velocity = state.velocity * 0.5 + ((-dx * 0.35) / elapsed) * 0.5
      drag.x = event.clientX
      drag.y = event.clientY
      drag.lastTime = event.timeStamp
    }
    const endDrag = (event: PointerEvent) => {
      if (!state.dragging) return
      state.dragging = false
      state.lastInteraction = performance.now()
      state.velocity =
        event.timeStamp - drag.lastTime > 80 ? 0 : clamp(state.velocity, -120, 120)
      if (event.pointerType === 'touch') state.pointer = null
    }
    const onLeaveWindow = () => {
      state.pointer = null
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    document.documentElement.addEventListener('mouseleave', onLeaveWindow)

    draw(canvas, state, routeRef.current, 0, reducedMotion)
    const resizeObserver = new ResizeObserver(() =>
      draw(canvas, state, routeRef.current, performance.now(), reducedMotion),
    )
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !document.hidden) start()
      else stop()
    })
    intersectionObserver.observe(canvas)

    const onVisibility = () => {
      if (document.hidden) stop()
      else if (visible) start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      document.documentElement.removeEventListener('mouseleave', onLeaveWindow)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="size-full touch-pan-y" />
}
