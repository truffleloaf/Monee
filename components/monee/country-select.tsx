'use client'

import { useMemo } from 'react'
import { SearchSelect, type SelectOption } from './search-select'
import {
  COUNTRIES,
  FX_CURRENCIES,
  countriesUsing,
  getCountry,
  getCurrencyInfo,
} from '@/lib/fx'

export function CountryBadge({ code }: { code: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/[0.06] text-[10px] font-semibold tracking-wide text-foreground/80"
    >
      {code.toUpperCase()}
    </span>
  )
}

export function CodeBadge({ code }: { code: string }) {
  return (
    <span className="grid h-8 min-w-12 shrink-0 place-items-center rounded-lg bg-lavender/15 px-1.5 text-[11px] font-semibold tracking-wide text-lavender">
      {code}
    </span>
  )
}

const countryOptions: SelectOption[] = COUNTRIES.map((country) => {
  const currency = getCurrencyInfo(country.currency)
  return {
    id: country.code,
    title: country.name,
    subtitle: `${currency.name} · ${currency.code}`,
    leading: <CountryBadge code={country.code} />,
    trailing: <span className="text-xs text-muted-foreground">{currency.code}</span>,
    search: `${country.name} ${country.code} ${currency.code} ${currency.name}`,
  }
})

function usedIn(currency: string) {
  const names = countriesUsing(currency).map((country) => country.name)
  if (names.length === 0) return ''
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}

const currencyOptions: SelectOption[] = FX_CURRENCIES.map((currency) => ({
  id: currency.code,
  title: `${currency.code} · ${currency.name}`,
  subtitle: usedIn(currency.code) ? `Used in ${usedIn(currency.code)}` : undefined,
  leading: <CodeBadge code={currency.code} />,
  trailing: <span className="text-xs text-muted-foreground">{currency.symbol.trim()}</span>,
  search: `${currency.code} ${currency.name} ${countriesUsing(currency.code)
    .map((country) => country.name)
    .join(' ')}`,
}))

function buildCurrencyOptions(currencies: { code: string; name: string; symbol: string }[]): SelectOption[] {
  return currencies.map((currency) => ({
    id: currency.code,
    title: `${currency.code} · ${currency.name}`,
    subtitle: usedIn(currency.code) ? `Used in ${usedIn(currency.code)}` : undefined,
    leading: <CodeBadge code={currency.code} />,
    trailing: <span className="text-xs text-muted-foreground">{currency.symbol}</span>,
    search: `${currency.code} ${currency.name} ${countriesUsing(currency.code).map((country) => country.name).join(' ')}`,
  }))
}

export function CountrySelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (countryCode: string) => void
}) {
  return (
    <SearchSelect
      label={label}
      value={value}
      options={countryOptions}
      onChange={onChange}
      searchLabel={`Search ${label.toLowerCase()}`}
      placeholder="Search country or currency"
    />
  )
}

export function CurrencyPicker({
  label,
  value,
  onChange,
  countryCode,
  exclude,
  currencies,
}: {
  label: string
  value: string
  onChange: (currency: string) => void
  /** When set, offers a shortcut back to this country's usual currency. */
  countryCode?: string
  exclude?: string[]
  currencies?: { code: string; name: string; symbol: string }[]
}) {
  const options = useMemo(
    () => {
      const source = currencies ? buildCurrencyOptions(currencies) : currencyOptions
      return exclude ? source.filter((option) => !exclude.includes(option.id)) : source
    },
    [exclude, currencies],
  )
  const usual = countryCode ? getCountry(countryCode) : null
  const differs = usual !== null && usual.currency !== value

  return (
    <SearchSelect
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      searchLabel={`Search ${label.toLowerCase()}`}
      placeholder="Search currency or country"
      hint={
        differs ? (
          <>
            Usually {usual.currency} in {usual.name}.{' '}
            <button
              type="button"
              onClick={() => onChange(usual.currency)}
              className="rounded text-lavender outline-none hover:underline focus-visible:ring-2 focus-visible:ring-lavender"
            >
              Use {usual.currency}
            </button>
          </>
        ) : undefined
      }
    />
  )
}
