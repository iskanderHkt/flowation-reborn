import { useMemo, useState, useCallback } from 'react'

type SortDir = 'asc' | 'desc' | null

interface UseSortOptions<T> {
  data: T[]
  defaultField?: keyof T & string
  defaultDir?: SortDir
}

interface UseSortReturn<T> {
  sorted: T[]
  sortField: (keyof T & string) | null
  sortDir: SortDir
  handleSort: (field: keyof T & string) => void
}

export function useSort<T>(options: UseSortOptions<T>): UseSortReturn<T> {
  const { data, defaultField = null, defaultDir = null } = options

  const [sortField, setSortField] = useState<(keyof T & string) | null>(defaultField)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const handleSort = useCallback(
    (field: keyof T & string) => {
      if (field !== sortField) {
        setSortField(field)
        setSortDir('asc')
        return
      }
      setSortDir((prev) => {
        if (prev === null) return 'asc'
        if (prev === 'asc') return 'desc'
        return null
      })
      if (sortDir === 'desc') setSortField(null)
    },
    [sortField, sortDir],
  )

  const sorted = useMemo(() => {
    if (!sortField || !sortDir) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortDir === 'asc' ? -1 : 1
      if (bVal == null) return sortDir === 'asc' ? 1 : -1
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortField, sortDir])

  return { sorted, sortField, sortDir, handleSort }
}
