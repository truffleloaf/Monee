'use client'

import { useMemo } from 'react'
import { CURRENCIES } from '@/lib/currencies'
import { SearchSelect, type SelectOption } from './search-select'

function CodeBadge({ code }: { code: string }) {
  return (
    <span className="grid h-8 min-w-12 shrink-0 place-items-center rounded-lg bg-lavender/15 px-1.5 text-[11px] font-semibold tracking-wide text-lavender">
      {code}
    </span>
  )
}

export function CurrencySelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (code: string) => void
  label: string
}) {
  const options = useMemo<SelectOption[]>(
    () =>
      CURRENCIES.map((currency) => ({
        id: currency.code,
        title: currency.country,
        subtitle: `${currency.name} · ${currency.code}`,
        leading: <CodeBadge code={currency.code} />,
        trailing: <span className="text-xs text-muted-foreground">{currency.symbol.trim()}</span>,
        search: `${currency.country} ${currency.name} ${currency.code}`,
      })),
    [],
  )

  return (
    <SearchSelect
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      searchLabel={`Search ${label.toLowerCase()}`}
      placeholder="Search country or currency"
    />
  )
}
