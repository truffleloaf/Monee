'use client'

import { CATEGORIES, type CategoryId } from '@/lib/finance-state'

export function CategoryNameField({ categoryId, value, onChange }: { categoryId: CategoryId; value: string; onChange: (label: string) => void }) {
  return (
    <label className="block text-xs text-muted-foreground">
      Category name
      <input
        list={`category-options-${categoryId}`}
        value={value}
        maxLength={36}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm text-foreground"
        aria-label={`Customize ${categoryId} category name`}
      />
      <datalist id={`category-options-${categoryId}`}>
        {CATEGORIES.map((category) => <option key={category.id} value={category.label} />)}
      </datalist>
    </label>
  )
}
