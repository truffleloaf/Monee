'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getCurrency, type Currency } from '@/lib/currencies'
import {
  defaultAssumptions,
  simulate,
  type Assumptions,
  type RateDirection,
  type ScenarioId,
  type ScenarioOptions,
  type SimResult,
} from '@/lib/simulation'

interface ScenarioContextValue {
  options: ScenarioOptions
  currency: Currency
  result: SimResult
  plan: SimResult
  setScenario: (scenario: ScenarioId) => void
  setRateDirection: (direction: RateDirection) => void
  setDelayPurchase: (delay: boolean) => void
  setCurrency: (code: string) => void
  updateAssumptions: (patch: Partial<Assumptions>) => void
  resetAssumptions: () => void
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null)

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ScenarioOptions>({
    scenario: 'plan',
    rateDirection: 1,
    delayPurchase: false,
    assumptions: defaultAssumptions('CNY'),
  })

  const setScenario = useCallback(
    (scenario: ScenarioId) => setOptions((prev) => ({ ...prev, scenario })),
    [],
  )
  const setRateDirection = useCallback(
    (rateDirection: RateDirection) => setOptions((prev) => ({ ...prev, rateDirection })),
    [],
  )
  const setDelayPurchase = useCallback(
    (delayPurchase: boolean) => setOptions((prev) => ({ ...prev, delayPurchase })),
    [],
  )
  const setCurrency = useCallback((code: string) => {
    const next = getCurrency(code)
    setOptions((prev) => ({
      ...prev,
      assumptions: {
        ...prev.assumptions,
        currency: next.code,
        baseRate: next.baseRate,
        transferAmount: next.defaultAmount,
      },
    }))
  }, [])
  const updateAssumptions = useCallback(
    (patch: Partial<Assumptions>) =>
      setOptions((prev) => ({ ...prev, assumptions: { ...prev.assumptions, ...patch } })),
    [],
  )
  const resetAssumptions = useCallback(
    () =>
      setOptions((prev) => ({
        ...prev,
        delayPurchase: false,
        assumptions: defaultAssumptions(prev.assumptions.currency),
      })),
    [],
  )

  const value = useMemo<ScenarioContextValue>(
    () => ({
      options,
      currency: getCurrency(options.assumptions.currency),
      result: simulate(options),
      plan: simulate({ ...options, scenario: 'plan' }),
      setScenario,
      setRateDirection,
      setDelayPurchase,
      setCurrency,
      updateAssumptions,
      resetAssumptions,
    }),
    [
      options,
      setScenario,
      setRateDirection,
      setDelayPurchase,
      setCurrency,
      updateAssumptions,
      resetAssumptions,
    ],
  )

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useScenario() {
  const context = useContext(ScenarioContext)
  if (!context) throw new Error('useScenario must be used within ScenarioProvider')
  return context
}
