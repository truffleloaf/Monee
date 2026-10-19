'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { todayIso } from '@/lib/dates'
import {
  applyRoute,
  chooseCountry,
  createDefaultState,
  sanitizeState,
  swapRoute,
  withMonthlyTotal,
  type CategoryId,
  type CategoryLabels,
  type ActualTransaction,
  type BudgetState,
  type SavedScenario,
  type ExchangeState,
  type FinanceState,
  type Holding,
  type LabState,
  type Payment,
  type PlanState,
  type RouteState,
  type WalletEntry,
} from '@/lib/finance-state'
import { pairKey } from '@/lib/fx'
import { validateWalletLedger } from '@/lib/wallet'

const STORAGE_KEY = 'monee:finance:v1'

interface FinanceContextValue {
  state: FinanceState
  /** False until saved selections have been read, so pages never flash demo values. */
  ready: boolean
  setRoute: (patch: Partial<RouteState>) => void
  chooseCountry: (side: 'send' | 'receive', countryCode: string) => void
  swapRoute: () => void
  updateExchange: (patch: Partial<Omit<ExchangeState, 'customRates'>>) => void
  setCustomRate: (from: string, to: string, rate: number | null) => void
  updatePlan: (patch: Partial<Omit<PlanState, 'categories' | 'payments' | 'holdings'>>) => void
  setCategory: (id: CategoryId, amount: number) => void
  setCategoryLabels: (labels: CategoryLabels) => void
  setMonthlyExpenses: (total: number) => void
  addPayment: () => void
  updatePayment: (id: string, patch: Partial<Omit<Payment, 'id'>>) => void
  removePayment: (id: string) => void
  addHolding: (currency: string, amount: number) => void
  updateHolding: (id: string, patch: Partial<Omit<Holding, 'id'>>) => void
  removeHolding: (id: string) => void
  updateLab: (patch: Partial<LabState>) => void
  reset: () => void
  addTransaction: (transaction: Omit<ActualTransaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<Omit<ActualTransaction, 'id'>>) => void
  removeTransaction: (id: string) => void
  updateBudget: (patch: Partial<BudgetState>) => void
  saveScenario: (name: string) => void
  openScenario: (id: string) => void
  duplicateScenario: (id: string) => void
  deleteScenario: (id: string) => void
  renameScenario: (id: string, name: string) => void
  setWalletOpening: (currency: string, amountMinor: number) => string | null
  setWalletReportCurrency: (currency: string) => void
  addWalletEntry: (entry: Omit<WalletEntry, 'id'>) => string | null
  updateWalletEntry: (id: string, entry: Omit<WalletEntry, 'id'>) => string | null
  removeWalletEntry: (id: string) => string | null
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

const makeId = () => Math.random().toString(36).slice(2, 9)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => createDefaultState('2026-01-05'))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const today = todayIso()
    let next = createDefaultState(today)
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) next = sanitizeState(JSON.parse(saved), today)
    } catch {
      // Unreadable saved data falls back to the demo configuration.
    }
    setState(next)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be unavailable (private mode); selections then last for the session.
    }
  }, [state, ready])

  const setRoute = useCallback((patch: Partial<RouteState>) => setState((prev) => applyRoute(prev, patch)), [])
  const chooseCountryAction = useCallback(
    (side: 'send' | 'receive', code: string) => setState((prev) => chooseCountry(prev, side, code)),
    [],
  )
  const swapRouteAction = useCallback(() => setState((prev) => swapRoute(prev)), [])

  const updateExchange = useCallback(
    (patch: Partial<Omit<ExchangeState, 'customRates'>>) =>
      setState((prev) => ({ ...prev, exchange: { ...prev.exchange, ...patch } })),
    [],
  )
  const setCustomRate = useCallback((from: string, to: string, rate: number | null) => {
    setState((prev) => {
      const customRates = { ...prev.exchange.customRates }
      const key = pairKey(from, to)
      if (rate && rate > 0) customRates[key] = rate
      else delete customRates[key]
      return { ...prev, exchange: { ...prev.exchange, customRates } }
    })
  }, [])

  const updatePlan = useCallback(
    (patch: Partial<Omit<PlanState, 'categories' | 'payments' | 'holdings'>>) =>
      setState((prev) => ({ ...prev, plan: { ...prev.plan, ...patch } })),
    [],
  )
  const setCategory = useCallback(
    (id: CategoryId, amount: number) =>
      setState((prev) => ({
        ...prev,
        plan: { ...prev.plan, categories: { ...prev.plan.categories, [id]: amount } },
      })),
    [],
  )
  const setCategoryLabels = useCallback((labels: CategoryLabels) => {
    setState((prev) => ({ ...prev, categoryLabels: { ...prev.categoryLabels, ...labels } }))
  }, [])
  const setMonthlyExpenses = useCallback(
    (total: number) => setState((prev) => withMonthlyTotal(prev, total)),
    [],
  )

  const addPayment = useCallback(
    () =>
      setState((prev) => {
        const last = prev.plan.payments[prev.plan.payments.length - 1]
        const payment: Payment = {
          id: makeId(),
          label: 'New payment',
          amount: 0,
          date: last?.date ?? prev.plan.transferDate,
          kind: 'other',
          frequency: 'once',
        }
        return { ...prev, plan: { ...prev.plan, payments: [...prev.plan.payments, payment] } }
      }),
    [],
  )
  const updatePayment = useCallback(
    (id: string, patch: Partial<Omit<Payment, 'id'>>) =>
      setState((prev) => ({
        ...prev,
        plan: {
          ...prev.plan,
          payments: prev.plan.payments.map((payment) =>
            payment.id === id ? { ...payment, ...patch } : payment,
          ),
        },
      })),
    [],
  )
  const removePayment = useCallback(
    (id: string) =>
      setState((prev) => ({
        ...prev,
        plan: { ...prev.plan, payments: prev.plan.payments.filter((payment) => payment.id !== id) },
      })),
    [],
  )

  const addHolding = useCallback(
    (currency: string, amount: number) =>
      setState((prev) => ({
        ...prev,
        plan: {
          ...prev.plan,
          holdings: [...prev.plan.holdings, { id: makeId(), currency, amount, monthlyIncome: 0 }],
        },
      })),
    [],
  )
  const updateHolding = useCallback(
    (id: string, patch: Partial<Omit<Holding, 'id'>>) =>
      setState((prev) => ({
        ...prev,
        plan: {
          ...prev.plan,
          holdings: prev.plan.holdings.map((holding) =>
            holding.id === id ? { ...holding, ...patch } : holding,
          ),
        },
      })),
    [],
  )
  const removeHolding = useCallback(
    (id: string) =>
      setState((prev) => ({
        ...prev,
        plan: { ...prev.plan, holdings: prev.plan.holdings.filter((holding) => holding.id !== id) },
      })),
    [],
  )

  const updateLab = useCallback(
    (patch: Partial<LabState>) => setState((prev) => ({ ...prev, lab: { ...prev.lab, ...patch } })),
    [],
  )
  const addTransaction = useCallback((transaction: Omit<ActualTransaction, 'id'>) => {
    setState((prev) => ({ ...prev, transactions: [...prev.transactions, { ...transaction, id: makeId() }] }))
  }, [])
  const updateTransaction = useCallback((id: string, patch: Partial<Omit<ActualTransaction, 'id'>>) => {
    setState((prev) => ({ ...prev, transactions: prev.transactions.map((item) => item.id === id ? { ...item, ...patch } : item) }))
  }, [])
  const removeTransaction = useCallback((id: string) => {
    setState((prev) => ({ ...prev, transactions: prev.transactions.filter((item) => item.id !== id) }))
  }, [])
  const updateBudget = useCallback((patch: Partial<BudgetState>) => {
    setState((prev) => ({ ...prev, budget: { ...prev.budget, ...patch, categories: patch.categories ? { ...prev.budget.categories, ...patch.categories } : prev.budget.categories } }))
  }, [])
  const saveScenario = useCallback((name: string) => {
    const cleanName = name.trim().slice(0, 60)
    if (!cleanName) return
    setState((prev) => {
      const scenario: SavedScenario = {
        id: makeId(), name: cleanName, route: prev.route, exchange: prev.exchange,
        plan: prev.plan, lab: prev.lab,
      }
      return { ...prev, savedScenarios: [...prev.savedScenarios, scenario].slice(-30) }
    })
  }, [])
  const openScenario = useCallback((id: string) => setState((prev) => {
    const scenario = prev.savedScenarios.find((item) => item.id === id)
    return scenario ? { ...prev, route: scenario.route, exchange: scenario.exchange, plan: scenario.plan, lab: scenario.lab } : prev
  }), [])
  const duplicateScenario = useCallback((id: string) => setState((prev) => {
    const scenario = prev.savedScenarios.find((item) => item.id === id)
    if (!scenario) return prev
    return { ...prev, savedScenarios: [...prev.savedScenarios, { ...scenario, id: makeId(), name: `${scenario.name} copy` }].slice(-30) }
  }), [])
  const deleteScenario = useCallback((id: string) => setState((prev) => ({ ...prev, savedScenarios: prev.savedScenarios.filter((item) => item.id !== id) })), [])
  const renameScenario = useCallback((id: string, name: string) => setState((prev) => ({ ...prev, savedScenarios: prev.savedScenarios.map((item) => item.id === id ? { ...item, name: name.slice(0, 60) } : item) })), [])
  const setWalletOpening = useCallback((currency: string, amountMinor: number) => {
    const openingMinor = { ...state.wallet.openingMinor, [currency]: amountMinor }
    const validation = validateWalletLedger(openingMinor, state.wallet.entries)
    if (!validation.ok) return validation.message
    setState((prev) => {
      const nextOpening = { ...prev.wallet.openingMinor, [currency]: amountMinor }
      if (!validateWalletLedger(nextOpening, prev.wallet.entries).ok) return prev
      return { ...prev, wallet: { ...prev.wallet, openingMinor: nextOpening } }
    })
    return null
  }, [state.wallet])
  const setWalletReportCurrency = useCallback((currency: string) => {
    setState((prev) => ({ ...prev, wallet: { ...prev.wallet, reportCurrency: currency } }))
  }, [])
  const addWalletEntry = useCallback((entry: Omit<WalletEntry, 'id'>) => {
    const nextEntry = { ...entry, id: makeId() }
    const entries = [...state.wallet.entries, nextEntry]
    const validation = validateWalletLedger(state.wallet.openingMinor, entries)
    if (!validation.ok) return validation.message
    setState((prev) => {
      const nextEntries = [...prev.wallet.entries, nextEntry]
      if (!validateWalletLedger(prev.wallet.openingMinor, nextEntries).ok) return prev
      return { ...prev, wallet: { ...prev.wallet, entries: nextEntries } }
    })
    return null
  }, [state.wallet])
  const updateWalletEntry = useCallback((id: string, entry: Omit<WalletEntry, 'id'>) => {
    const entries = state.wallet.entries.map((item) => item.id === id ? { ...entry, id } : item)
    const validation = validateWalletLedger(state.wallet.openingMinor, entries)
    if (!validation.ok) return validation.message
    setState((prev) => {
      const nextEntries = prev.wallet.entries.map((item) => item.id === id ? { ...entry, id } : item)
      if (!validateWalletLedger(prev.wallet.openingMinor, nextEntries).ok) return prev
      return { ...prev, wallet: { ...prev.wallet, entries: nextEntries } }
    })
    return null
  }, [state.wallet])
  const removeWalletEntry = useCallback((id: string) => {
    const entries = state.wallet.entries.filter((item) => item.id !== id)
    const validation = validateWalletLedger(state.wallet.openingMinor, entries)
    if (!validation.ok) return validation.message
    setState((prev) => {
      const nextEntries = prev.wallet.entries.filter((item) => item.id !== id)
      if (!validateWalletLedger(prev.wallet.openingMinor, nextEntries).ok) return prev
      return { ...prev, wallet: { ...prev.wallet, entries: nextEntries } }
    })
    return null
  }, [state.wallet])
  const reset = useCallback(() => setState(createDefaultState(todayIso())), [])

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      ready,
      setRoute,
      chooseCountry: chooseCountryAction,
      swapRoute: swapRouteAction,
      updateExchange,
      setCustomRate,
      updatePlan,
      setCategory,
      setCategoryLabels,
      setMonthlyExpenses,
      addPayment,
      updatePayment,
      removePayment,
      addHolding,
      updateHolding,
      removeHolding,
      updateLab,
      reset,
      addTransaction,
      updateTransaction,
      removeTransaction,
      updateBudget,
      saveScenario,
      openScenario,
      duplicateScenario,
      deleteScenario,
      renameScenario,
      setWalletOpening,
      setWalletReportCurrency,
      addWalletEntry,
      updateWalletEntry,
      removeWalletEntry,
    }),
    [
      state,
      ready,
      setRoute,
      chooseCountryAction,
      swapRouteAction,
      updateExchange,
      setCustomRate,
      updatePlan,
      setCategory,
      setCategoryLabels,
      setMonthlyExpenses,
      addPayment,
      updatePayment,
      removePayment,
      addHolding,
      updateHolding,
      removeHolding,
      updateLab,
      reset,
      addTransaction,
      updateTransaction,
      removeTransaction,
      updateBudget,
      saveScenario,
      openScenario,
      duplicateScenario,
      deleteScenario,
      renameScenario,
      setWalletOpening,
      setWalletReportCurrency,
      addWalletEntry,
      updateWalletEntry,
      removeWalletEntry,
    ],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used within FinanceProvider')
  return context
}
