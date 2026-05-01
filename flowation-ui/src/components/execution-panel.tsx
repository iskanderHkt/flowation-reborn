import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Spinner } from '@/components/ui/spinner.tsx'
import { HistoryPagination } from '@/components/ui/history-pagination.tsx'
import { cn } from '@/lib/cn.ts'
import type { ExecutionResult, PageResult } from '@/api/types.ts'
import { ResultView } from './execution/result-view.tsx'
import { HistoryList } from './execution/history-list.tsx'

// Re-export for backward compatibility
export { ResultView } from './execution/result-view.tsx'

/* ─── Main Panel ────────────────────────────────────── */

interface ExecutionPanelProps {
  result: ExecutionResult | null
  historyPage: PageResult<ExecutionResult> | undefined
  isExecuting: boolean
  isLoadingHistory: boolean
  historyPageIndex: number
  onHistoryPageChange: (page: number) => void
}

export function ExecutionPanel({
  result,
  historyPage,
  isExecuting,
  isLoadingHistory,
  historyPageIndex,
  onHistoryPageChange,
}: ExecutionPanelProps) {
  const [tab, setTab] = useState<'result' | 'history'>('result')
  const history = historyPage?.content ?? []

  return (
    <div className="flex flex-col h-full border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="flex items-center border-b border-[var(--color-border)] px-1">
        <TabBtn active={tab === 'result'} onClick={() => setTab('result')}>
          Result
        </TabBtn>
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>
          History ({historyPage?.total ?? 0})
        </TabBtn>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === 'result' ? (
          isExecuting ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-[var(--color-text-muted)]">
              <Spinner /> Executing...
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key={result.runId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ResultView result={result} compact={false} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[var(--color-text-muted)] py-8 text-center"
                >
                  Run the operation to see results here
                </motion.div>
              )}
            </AnimatePresence>
          )
        ) : isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : !history.length ? (
          <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            No execution history
          </div>
        ) : (
          <HistoryList history={history} />
        )}
      </div>

      {tab === 'history' && historyPage && (
        <HistoryPagination
          page={historyPageIndex}
          total={historyPage.total}
          size={historyPage.size}
          onChange={onHistoryPageChange}
        />
      )}
    </div>
  )
}

/* ─── Tab button ────────────────────────────────────── */

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
        active
          ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
      )}
    >
      {children}
    </button>
  )
}
