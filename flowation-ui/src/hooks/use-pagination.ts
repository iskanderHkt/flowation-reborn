import { useMemo, useState, useCallback } from 'react'

interface UsePaginationOptions {
  totalItems: number
  defaultPageSize?: number
}

interface UsePaginationReturn {
  page: number
  pageSize: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  startIndex: number
  endIndex: number
  paginate: <T>(items: T[]) => T[]
}

export function usePagination(
  options: UsePaginationOptions,
): UsePaginationReturn {
  const { totalItems, defaultPageSize = 10 } = options

  const [page, setPageRaw] = useState(0)
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  )

  const clampedPage = useMemo(
    () => Math.max(0, Math.min(page, totalPages - 1)),
    [page, totalPages],
  )

  // Keep internal state in sync when clamping changes it
  if (clampedPage !== page) {
    setPageRaw(clampedPage)
  }

  const setPage = useCallback(
    (p: number) => {
      setPageRaw(Math.max(0, Math.min(p, totalPages - 1)))
    },
    [totalPages],
  )

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size)
    setPageRaw(0)
  }, [])

  const startIndex = clampedPage * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const paginate = useCallback(
    <T>(items: T[]): T[] => items.slice(startIndex, endIndex),
    [startIndex, endIndex],
  )

  return {
    page: clampedPage,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    startIndex,
    endIndex,
    paginate,
  }
}
