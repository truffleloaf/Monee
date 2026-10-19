'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SESSION_KEY = 'monee:demo-session:v1'

interface DemoSessionValue {
  active: boolean
  startDemo: () => void
  endDemo: () => void
}

const DemoSessionContext = createContext<DemoSessionValue | null>(null)

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    try {
      setActive(window.sessionStorage.getItem(SESSION_KEY) === 'active')
    } catch {
      setActive(false)
    }
  }, [])

  const startDemo = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, 'active')
    } catch {
      // Demo mode remains available for this page view if browser storage is disabled.
    }
    setActive(true)
  }, [])

  const endDemo = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // The in-memory session still ends when storage is unavailable.
    }
    setActive(false)
  }, [])

  const value = useMemo(() => ({ active, startDemo, endDemo }), [active, startDemo, endDemo])
  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext)
  if (!context) throw new Error('useDemoSession must be used within DemoSessionProvider')
  return context
}
