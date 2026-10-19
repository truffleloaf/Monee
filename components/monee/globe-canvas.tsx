'use client'

import { useEffect, useRef } from 'react'
import { geoGraticule, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import landTopology from 'world-atlas/land-110m.json'
import { GLOBE_CURRENCIES, formatChange } from '@/lib/currencies'

const topology = landTopology as unknown as Topology
const land = feature(topology, topology.objects.land as GeometryCollection)
const graticule = geoGraticule().step([15, 15])()

const START_LONGITUDE = 96
const DEFAULT_TILT = 14
const MAX_TILT = 55
const AUTO_SPEED = 5
const STEER_SPEED = 46
const STEER_DEADZONE = 0.2
const STEER_RANGE = 1.6
const MIN_LABEL_GAP = 4

const MINT = '#85d6b1'
const CORAL = '#e58a87'
const LAVENDER = '#B8A8F8'

interface Pointer {
  x: number
  y: number
  type: string
  overCanvas: boolean
}

interface GlobeState {
  lon: number
  lat: number
  velocity: number
  focus: { lon: number; lat: number } | null
  pointer: Pointer | null
  dragging: boolean
  steerLock: { x: number; y: number } | null
  hovered: string | null
  lastInteraction: number
}

interface Marker {
  code: string
  x: number
  y: number
}

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180

function overlaps(a: Rect, b: Rect) {
  return a.x0 < b.x1 + MIN_LABEL_GAP && a.x1 + MIN_LABEL_GAP > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

function draw(
  canvas: HTMLCanvasElement,
  view: { lon: number; lat: number },
  selectedCode: string,
  hoveredCode: string | null,
  referenceCode: string,
  movements: Record<string, number | null>,
): Marker[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  const dpr = window.devicePixelRatio || 1
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return []
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - 2

  const projection = geoOrthographic()
    .scale(radius)
    .translate([cx, cy])
    .clipAngle(90)
    .rotate([-view.lon, -view.lat, 6])
  const path = geoPath(projection, ctx)

  const body = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.4,
    radius * 0.1,
    cx,
    cy,
    radius,
  )
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

  // Lifted arc from the selected sending country to the home hub
  const selected = GLOBE_CURRENCIES.find(({ code }) => code === selectedCode)
  const reference = GLOBE_CURRENCIES.find(({ code }) => code === referenceCode)
  const origin = selected ?? GLOBE_CURRENCIES[0]
  const destination = reference ?? GLOBE_CURRENCIES.find(({ code }) => code === 'MYR')!
  const interpolate = geoInterpolate([origin.lon, origin.lat], [destination.lon, destination.lat])
  const steps = 64
  ctx.beginPath()
  let drawing = false
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const projected = projection(interpolate(t))
    if (!projected) {
      drawing = false
      continue
    }
    const lift = 1 + 0.14 * Math.sin(Math.PI * t)
    const x = cx + (projected[0] - cx) * lift
    const y = cy + (projected[1] - cy) * lift
    if (drawing) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
    drawing = true
  }
  ctx.strokeStyle = 'rgba(133, 214, 177, 0.9)'
  ctx.lineWidth = 1.3
  ctx.setLineDash([3, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // Lighting: highlight upper-left, terminator lower-right
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

  // Markers
  const markers: Marker[] = []
  for (const currency of GLOBE_CURRENCIES) {
    const projected = projection([currency.lon, currency.lat])
    if (projected) markers.push({ code: currency.code, x: projected[0], y: projected[1] })
  }
  const homePoint = projection([destination.lon, destination.lat])

  for (const marker of markers) {
    const isSelected = marker.code === selectedCode
    const isHovered = marker.code === hoveredCode
    const movement = movements[marker.code]
    const tone = movement === null || movement === undefined || Math.abs(movement) < 0.05
      ? 'rgba(243, 240, 234, 0.62)'
      : movement > 0 ? MINT : CORAL
    if (isSelected || isHovered) {
      const glowColor = isSelected ? '184, 168, 248' : '243, 240, 234'
      const glow = ctx.createRadialGradient(marker.x, marker.y, 0, marker.x, marker.y, 16)
      glow.addColorStop(0, `rgba(${glowColor}, 0.5)`)
      glow.addColorStop(1, `rgba(${glowColor}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(marker.x, marker.y, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(marker.x, marker.y, 6.5, 0, Math.PI * 2)
      ctx.strokeStyle = isSelected ? LAVENDER : 'rgba(243, 240, 234, 0.85)'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
    ctx.fillStyle = isSelected ? LAVENDER : tone
    ctx.beginPath()
    ctx.arc(marker.x, marker.y, isSelected || isHovered ? 3.4 : 2.4, 0, Math.PI * 2)
    ctx.fill()
  }

  if (homePoint) {
    ctx.beginPath()
    ctx.arc(homePoint[0], homePoint[1], 5.5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(243, 240, 234, 0.6)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#F3F0EA'
    ctx.beginPath()
    ctx.arc(homePoint[0], homePoint[1], 2.8, 0, Math.PI * 2)
    ctx.fill()
  }

  // Labels, placed greedily so crowded regions stay readable
  ctx.font = '500 10px ui-sans-serif, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  const placed: Rect[] = []
  const place = (x: number, y: number, text: string, strong: boolean, color: string, force: boolean) => {
    const w = ctx.measureText(text).width
    const padX = strong ? 6 : 0
    const rect: Rect = { x0: x + 8, y0: y - 16, x1: x + 8 + w + padX * 2, y1: y - 2 }
    if (!force && placed.some((other) => overlaps(rect, other))) return
    placed.push(rect)
    if (strong) {
      ctx.fillStyle = 'rgba(19, 21, 24, 0.88)'
      ctx.beginPath()
      ctx.roundRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0, 6)
      ctx.fill()
      ctx.strokeStyle = 'rgba(243, 240, 234, 0.14)'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
    ctx.fillStyle = color
    ctx.fillText(text, rect.x0 + padX, (rect.y0 + rect.y1) / 2 + 0.5)
  }

  if (homePoint) place(homePoint[0], homePoint[1], referenceCode, false, 'rgba(243, 240, 234, 0.95)', true)
  const hoveredMarker = markers.find((m) => m.code === hoveredCode)
  const selectedMarker = markers.find((m) => m.code === selectedCode)
  if (hoveredMarker) {
    const currency = GLOBE_CURRENCIES.find(({ code }) => code === hoveredMarker.code)!
    const movement = movements[hoveredMarker.code]
    place(
      hoveredMarker.x,
      hoveredMarker.y,
      movement === null || movement === undefined ? currency.code : `${currency.code} ${formatChange(movement)}`,
      true,
      movement === null || movement === undefined ? 'rgba(243, 240, 234, 0.7)' : movement >= 0 ? MINT : CORAL,
      true,
    )
  }
  if (selectedMarker && selectedMarker.code !== hoveredCode) {
    place(selectedMarker.x, selectedMarker.y, selectedMarker.code, true, LAVENDER, true)
  }
  const rest = markers
    .filter((m) => m.code !== hoveredCode && m.code !== selectedCode)
    .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
  for (const marker of rest) {
    place(marker.x, marker.y, marker.code, false, 'rgba(243, 240, 234, 0.6)', false)
  }

  ctx.beginPath()
  ctx.arc(cx, cy, radius - 0.5, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(184, 168, 248, 0.32)'
  ctx.lineWidth = 1
  ctx.stroke()

  return markers
}

interface GlobeCanvasProps {
  selected: string
  reference: string
  movements: Record<string, number | null>
  onSelect: (code: string) => void
  onHover?: (code: string | null) => void
}

export function GlobeCanvas({ selected, reference, movements, onSelect, onHover }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GlobeState>({
    lon: START_LONGITUDE,
    lat: DEFAULT_TILT,
    velocity: 0,
    focus: null,
    pointer: null,
    dragging: false,
    steerLock: null,
    hovered: null,
    lastInteraction: 0,
  })
  const selectedRef = useRef(selected)
  const handlersRef = useRef({ onSelect, onHover })
  const previousSelected = useRef(selected)

  useEffect(() => {
    selectedRef.current = selected
    handlersRef.current = { onSelect, onHover }
  })

  useEffect(() => {
    if (previousSelected.current === selected) return
    previousSelected.current = selected
    const target = GLOBE_CURRENCIES.find(({ code }) => code === selected) ?? GLOBE_CURRENCIES[0]
    const state = stateRef.current
    state.focus = { lon: target.lon, lat: clamp(target.lat * 0.8, -40, MAX_TILT) }
    state.velocity = 0
    state.steerLock = state.pointer ? { x: state.pointer.x, y: state.pointer.y } : null
  }, [selected])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = stateRef.current

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = 0
    let visible = true
    let markers: Marker[] = []
    const drag = { x: 0, y: 0, startX: 0, startY: 0, lastTime: 0 }

    const hitTest = (clientX: number, clientY: number, tolerance: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const radius = Math.min(rect.width, rect.height) / 2
      if (Math.hypot(x - rect.width / 2, y - rect.height / 2) > radius) return null
      let best: string | null = null
      let bestDistance = tolerance
      for (const marker of markers) {
        const distance = Math.hypot(marker.x - x, marker.y - y)
        if (distance < bestDistance) {
          best = marker.code
          bestDistance = distance
        }
      }
      return best
    }

    const setHovered = (code: string | null) => {
      if (state.hovered === code) return
      state.hovered = code
      handlersRef.current.onHover?.(code)
    }

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

      if (pointer && usesMouse) {
        const canHover = inRange && pointer.overCanvas && !state.dragging
        setHovered(canHover ? hitTest(pointer.x, pointer.y, 11) : null)
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
        } else {
          const steering = !reducedMotion && usesMouse && inRange
          let lonRate: number
          let latTarget: number
          if (steering) {
            if (state.steerLock || state.hovered) {
              lonRate = 0
              latTarget = state.lat
            } else {
              const sx = clamp(nx, -1.4, 1.4)
              const magnitude = Math.max(0, Math.abs(sx) - STEER_DEADZONE) / (1 - STEER_DEADZONE)
              lonRate = Math.sign(sx) * magnitude * STEER_SPEED
              latTarget = clamp(DEFAULT_TILT - clamp(ny, -1.4, 1.4) * 38, -MAX_TILT, MAX_TILT)
            }
          } else {
            lonRate = reducedMotion ? 0 : AUTO_SPEED
            latTarget = now - state.lastInteraction > 2500 ? DEFAULT_TILT : state.lat
          }
          state.lon += (lonRate + state.velocity) * dt
          state.velocity *= Math.exp(-dt * 3)
          state.lat += (latTarget - state.lat) * (1 - Math.exp(-dt * 4))
        }
        state.lon = wrap(state.lon)
      }

      canvas.style.cursor = state.dragging ? 'grabbing' : state.hovered ? 'pointer' : 'grab'
      markers = draw(canvas, state, selectedRef.current, state.hovered, reference, movements)
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
      state.steerLock = null
      state.pointer = {
        x: event.clientX,
        y: event.clientY,
        type: event.pointerType,
        overCanvas: true,
      }
      drag.x = drag.startX = event.clientX
      drag.y = drag.startY = event.clientY
      drag.lastTime = event.timeStamp
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      state.pointer = {
        x: event.clientX,
        y: event.clientY,
        type: event.pointerType,
        overCanvas: event.target === canvas,
      }
      if (state.steerLock) {
        const moved = Math.hypot(event.clientX - state.steerLock.x, event.clientY - state.steerLock.y)
        if (moved > 30) state.steerLock = null
      }
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

    const endDrag = (event: PointerEvent, allowClick: boolean) => {
      if (!state.dragging) return
      state.dragging = false
      state.lastInteraction = performance.now()
      const travelled = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
      if (travelled < 6) {
        state.velocity = 0
        if (allowClick) {
          const code = hitTest(event.clientX, event.clientY, event.pointerType === 'touch' ? 18 : 11)
          if (code) {
            if (event.pointerType === 'touch') setHovered(code)
            handlersRef.current.onSelect(code)
          }
        }
      } else if (event.timeStamp - drag.lastTime > 80) {
        state.velocity = 0
      } else {
        state.velocity = clamp(state.velocity, -120, 120)
      }
      if (event.pointerType === 'touch') state.pointer = null
    }
    const onPointerUp = (event: PointerEvent) => endDrag(event, true)
    const onPointerCancel = (event: PointerEvent) => endDrag(event, false)

    const onMouseLeaveWindow = () => {
      state.pointer = null
      state.steerLock = null
      setHovered(null)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    document.documentElement.addEventListener('mouseleave', onMouseLeaveWindow)

    markers = draw(canvas, state, selectedRef.current, state.hovered, reference, movements)
    const resizeObserver = new ResizeObserver(() => {
      markers = draw(canvas, state, selectedRef.current, state.hovered, reference, movements)
    })
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
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      document.documentElement.removeEventListener('mouseleave', onMouseLeaveWindow)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reference, movements])

  const current = GLOBE_CURRENCIES.find(({ code }) => code === selected) ?? GLOBE_CURRENCIES[0]

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Interactive globe with historical currency movements against ${reference}. Selected ${current.country} (${current.code}). Move your cursor over the globe to steer it, drag to spin it, and select a currency marker.`}
      className="size-full touch-pan-y"
    />
  )
}
