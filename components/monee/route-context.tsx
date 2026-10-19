'use client'

import { ArrowLeftRight } from 'lucide-react'
import { CountrySelect, CurrencyPicker } from './country-select'
import { useFinance } from './finance-provider'

export function RouteContext({
  sendLabel = 'Home / sending country',
  receiveLabel = 'Study / receiving country',
}: {
  sendLabel?: string
  receiveLabel?: string
}) {
  const { state, chooseCountry, setRoute, swapRoute } = useFinance()
  const { route } = state

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
      <div className="grid gap-4 sm:grid-cols-2">
        <CountrySelect
          label={sendLabel}
          value={route.sendCountry}
          onChange={(code) => chooseCountry('send', code)}
        />
        <CurrencyPicker
          label="Sending currency"
          value={route.sendCurrency}
          countryCode={route.sendCountry}
          onChange={(code) => setRoute({ sendCurrency: code })}
        />
      </div>
      <button
        type="button"
        onClick={swapRoute}
        aria-label="Swap sending and receiving"
        className="mx-auto inline-flex size-11 items-center justify-center rounded-full border border-foreground/15 bg-background/70 text-foreground outline-none hover:border-lavender/50 hover:bg-lavender/10 focus-visible:ring-2 focus-visible:ring-lavender"
      >
        <ArrowLeftRight className="size-4" aria-hidden />
      </button>
      <div className="grid gap-4 sm:grid-cols-2">
        <CountrySelect
          label={receiveLabel}
          value={route.receiveCountry}
          onChange={(code) => chooseCountry('receive', code)}
        />
        <CurrencyPicker
          label="Spending currency"
          value={route.receiveCurrency}
          countryCode={route.receiveCountry}
          onChange={(code) => setRoute({ receiveCurrency: code })}
        />
      </div>
    </div>
  )
}
