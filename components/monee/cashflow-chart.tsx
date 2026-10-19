'use client'

import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDelta, formatMyr, type SimPoint } from '@/lib/simulation'

interface ChartDatum {
  week: number
  balance: number
  breached: boolean
  planBalance?: number
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const datum: ChartDatum = payload[0].payload
  const delta = datum.planBalance !== undefined ? datum.balance - datum.planBalance : 0
  return (
    <div className="rounded-lg border border-foreground/10 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <p className="text-muted-foreground">Week {datum.week}</p>
      <p className="mt-0.5 font-medium text-foreground tabular-nums">{formatMyr(datum.balance)}</p>
      {datum.planBalance !== undefined && Math.round(delta) !== 0 && (
        <p className="mt-0.5 text-muted-foreground tabular-nums">
          {formatDelta(delta)} vs your plan
        </p>
      )}
      {datum.breached && <p className="mt-0.5 text-coral">Below safety reserve</p>}
    </div>
  )
}

export function CashflowChart({
  points,
  comparison,
  reserve,
  accent = '#B8A8F8',
  height = 280,
  compact = false,
}: {
  points: SimPoint[]
  comparison?: SimPoint[]
  reserve: number
  accent?: string
  height?: number
  compact?: boolean
}) {
  const { domain, ticks } = useMemo(() => {
    const values = [
      reserve,
      ...points.map((point) => point.balance),
      ...(comparison?.map((point) => point.balance) ?? []),
    ]
    const step = 3000
    const low = Math.min(0, Math.floor(Math.min(...values) / step) * step)
    const high = Math.max(9000, Math.ceil(Math.max(...values) / step) * step)
    const ticks: number[] = []
    for (let tick = low; tick <= high; tick += step) ticks.push(tick)
    return { domain: [low, high] as [number, number], ticks }
  }, [points, comparison, reserve])

  const data = useMemo<ChartDatum[]>(
    () =>
      points.map((point, index) => ({
        week: point.week,
        balance: point.balance,
        breached: point.breached,
        planBalance: comparison?.[index]?.balance,
      })),
    [points, comparison],
  )
  const gradientId = `fill-${accent.replace('#', '')}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: compact ? 6 : 12, left: compact ? 6 : -8, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(243,240,234,0.06)" />
        <ReferenceLine y={0} stroke="#E58A87" strokeDasharray="2 4" strokeOpacity={0.7} />
        <XAxis
          dataKey="week"
          tickFormatter={(value) => `W${value}`}
          tick={{ fill: '#A3A6AB', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(243,240,234,0.22)' }}
          tickLine={false}
          interval={compact ? 2 : 0}
          padding={compact ? { left: 12, right: 12 } : undefined}
          tickMargin={8}
        />
        <YAxis
          hide={compact}
          domain={domain}
          ticks={ticks}
          tickFormatter={(value) => `${value / 1000}k`}
          tick={{ fill: '#A3A6AB', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <ReferenceLine
          y={reserve}
          stroke="#B8A8F8"
          strokeDasharray="5 4"
          strokeOpacity={0.7}
          label={
            compact
              ? undefined
              : {
                  value: `Safety reserve · ${formatMyr(reserve)}`,
                  position: 'insideTopRight',
                  fill: '#B8A8F8',
                  fontSize: 11,
                }
          }
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(243,240,234,0.16)' }} />
        {comparison && (
          <Line
            type="monotone"
            dataKey="planBalance"
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
          activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
          dot={(props: any) => {
            const { cx, cy, payload, index } = props
            if (!payload.breached) return <g key={index} />
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={compact ? 3 : 4.5}
                fill="#E58A87"
                stroke="#17191C"
                strokeWidth={1.5}
              />
            )
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
