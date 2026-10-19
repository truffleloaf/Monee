'use client'

import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDate } from '@/lib/dates'
import { formatCompact, formatPlanMoney } from '@/lib/fx'
import type { SimResult } from '@/lib/plan'

interface Datum {
  day: number
  date: string
  balance: number
  breached: boolean
  comparison?: number
  events: { label: string; delta: number }[]
}

function niceStep(rough: number) {
  const power = Math.pow(10, Math.floor(Math.log10(rough)))
  const fraction = rough / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * power
}

function ChartTooltip({ active, payload, currency }: any) {
  if (!active || !payload?.length) return null
  const datum: Datum = payload[0].payload
  const diff = datum.comparison !== undefined ? datum.balance - datum.comparison : 0
  return (
    <div className="max-w-60 rounded-lg border border-foreground/10 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <p className="text-muted-foreground">
        {formatDate(datum.date)} · day {datum.day}
      </p>
      <p className="mt-0.5 font-medium text-foreground tabular-nums">
        {formatPlanMoney(datum.balance, currency)}
      </p>
      {datum.comparison !== undefined && Math.round(diff) !== 0 && (
        <p className="mt-0.5 text-muted-foreground tabular-nums">
          {formatPlanMoney(diff, currency, { sign: true })} vs baseline
        </p>
      )}
      {datum.events.map((event) => (
        <p
          key={event.label}
          className={event.delta >= 0 ? 'mt-0.5 text-mint' : 'mt-0.5 text-muted-foreground'}
        >
          {event.label} {formatPlanMoney(event.delta, currency, { sign: true })}
        </p>
      ))}
      {datum.breached && <p className="mt-0.5 text-coral">Below safety reserve</p>}
    </div>
  )
}

export function BalanceChart({
  sim,
  comparison,
  reserve,
  currency,
  accent = '#B8A8F8',
  height = 300,
  label,
}: {
  sim: SimResult
  comparison?: SimResult
  reserve: number
  currency: string
  accent?: string
  height?: number
  label: string
}) {
  const data = useMemo<Datum[]>(
    () =>
      sim.points.map((point, index) => ({
        day: point.day,
        date: point.date,
        balance: point.balance,
        breached: point.breached,
        events: point.events,
        comparison: comparison?.points[index]?.balance,
      })),
    [sim, comparison],
  )

  const { domain, ticks, breachRanges } = useMemo(() => {
    const values = [reserve, 0, ...data.map((d) => d.balance), ...data.map((d) => d.comparison ?? 0)]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const step = niceStep((max - min || 1) / 4)
    const low = Math.floor(min / step) * step
    const high = Math.ceil(max / step) * step
    const ticks: number[] = []
    for (let tick = low; tick <= high + step / 2; tick += step) ticks.push(Number(tick.toFixed(6)))

    const ranges: { from: number; to: number }[] = []
    let start: number | null = null
    for (const point of sim.points) {
      if (point.breached && start === null) start = point.day
      if (!point.breached && start !== null) {
        ranges.push({ from: start, to: point.day - 1 })
        start = null
      }
    }
    if (start !== null) ranges.push({ from: start, to: sim.points[sim.points.length - 1].day })
    return { domain: [low, high] as [number, number], ticks, breachRanges: ranges }
  }, [data, reserve, sim.points])

  const gradientId = `balance-fill-${accent.replace('#', '')}`
  const horizon = sim.final.day
  const tickStep = horizon <= 112 ? 7 : 30
  const axisTicks = Array.from({ length: Math.ceil(horizon / tickStep) + 1 }, (_, index) => Math.min(index * tickStep, horizon))

  return (
    <div role="group" aria-label={label}>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Chart legend">
        <li className="inline-flex items-center gap-2"><span className="h-0.5 w-4 rounded" style={{ backgroundColor: accent }} aria-hidden />Projected balance</li>
        {comparison && <li className="inline-flex items-center gap-2"><span className="w-4 border-t border-dashed border-muted-foreground" aria-hidden />Baseline</li>}
        <li className="inline-flex items-center gap-2"><span className="w-4 border-t border-dashed border-coral" aria-hidden />Zero balance</li>
        <li className="inline-flex items-center gap-2"><span className="w-4 border-t border-dashed border-lavender" aria-hidden />Safety reserve</li>
      </ul>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(243,240,234,0.06)" />
          {breachRanges.map((range) => (
            <ReferenceArea
              key={range.from}
              x1={range.from}
              x2={range.to}
              fill="#E58A87"
              fillOpacity={0.1}
              ifOverflow="hidden"
            />
          ))}
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, horizon]}
            ticks={axisTicks}
            tickFormatter={(value) => (value === 0 ? 'Start' : horizon <= 112 ? `W${Math.ceil(value / 7)}` : `${Math.ceil(value / 30)} mo`)}
            tick={{ fill: '#A3A6AB', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(243,240,234,0.22)' }}
            tickLine={false}
            tickMargin={8}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickFormatter={(value) => formatCompact(value)}
            tick={{ fill: '#A3A6AB', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <ReferenceLine
            y={0}
            stroke="#E58A87"
            strokeDasharray="2 4"
            strokeOpacity={0.75}
            label={{ value: 'Zero balance', position: 'insideTopRight', fill: '#E58A87', fontSize: 10 }}
          />
          <ReferenceLine
            y={reserve}
            stroke="#B8A8F8"
            strokeDasharray="5 4"
            strokeOpacity={0.7}
            label={{
              value: `Safety reserve · ${formatPlanMoney(reserve, currency)}`,
              position: 'insideBottomRight',
              fill: '#B8A8F8',
              fontSize: 11,
            }}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ stroke: 'rgba(243,240,234,0.16)' }}
          />
          {comparison && (
            <Line
              type="monotone"
              dataKey="comparison"
              stroke="#A3A6AB"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke={accent}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
