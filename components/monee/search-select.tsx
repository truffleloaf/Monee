'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  id: string
  title: string
  subtitle?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  /** Extra text matched by the search box. */
  search: string
}

export function SearchSelect({
  label,
  value,
  options,
  onChange,
  searchLabel,
  placeholder,
  hint,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (id: string) => void
  searchLabel: string
  placeholder: string
  hint?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const labelId = `${baseId}-label`

  const selected = options.find((option) => option.id === value) ?? options[0]
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.search.toLowerCase().includes(needle))
  }, [query, options])

  const openList = () => {
    setQuery('')
    setActiveIndex(Math.max(0, options.findIndex((option) => option.id === value)))
    setOpen(true)
  }

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  const choose = (id: string) => {
    onChange(id)
    close(true)
  }

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, filtered])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(Math.max(0, filtered.length - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = filtered[activeIndex]
      if (target) choose(target.id)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <span id={labelId} className="block text-sm text-muted-foreground">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${baseId}-value`}
        onClick={() => (open ? close(false) : openList())}
        className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-left transition-colors outline-none hover:border-foreground/20 focus-visible:border-lavender/60 focus-visible:ring-2 focus-visible:ring-lavender/40"
      >
        {selected.leading}
        <span id={`${baseId}-value`} className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{selected.title}</span>
          {selected.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">{selected.subtitle}</span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 min-w-64 overflow-hidden rounded-2xl border border-foreground/10 bg-popover shadow-2xl">
          <div className="flex items-center gap-2 border-b border-foreground/[0.08] px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={
                filtered[activeIndex] ? `${baseId}-${filtered[activeIndex].id}` : undefined
              }
              aria-label={searchLabel}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground" role="presentation">
                Nothing matches &ldquo;{query}&rdquo;
              </li>
            )}
            {filtered.map((option, index) => (
              <li
                key={option.id}
                id={`${baseId}-${option.id}`}
                role="option"
                aria-selected={option.id === value}
                data-active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2',
                  index === activeIndex && 'bg-foreground/[0.07]',
                )}
              >
                {option.leading}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{option.title}</span>
                  {option.subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.subtitle}
                    </span>
                  )}
                </span>
                {option.trailing}
                {option.id === value && <Check className="size-4 text-lavender" aria-hidden />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
