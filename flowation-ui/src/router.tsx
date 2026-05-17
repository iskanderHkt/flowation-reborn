import { lazy, Suspense } from 'react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from '@tanstack/react-router'
import { Layout } from '@/components/layout.tsx'
import { ErrorBoundary } from '@/components/error-boundary.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'

// Light routes — eagerly loaded
import { OperationsPage } from '@/routes/operations/index.tsx'
import { OperationNewPage } from '@/routes/operations/new.tsx'
import { FlowsPage } from '@/routes/flows/index.tsx'
import { FlowNewPage } from '@/routes/flows/new.tsx'
import { EnvironmentsPage } from '@/routes/environments/index.tsx'
import { EnvironmentNewPage } from '@/routes/environments/new.tsx'
import { EnvironmentEditPage } from '@/routes/environments/edit.tsx'
import { BatchPage } from '@/routes/batch/index.tsx'
import { BatchNewPage } from '@/routes/batch/new.tsx'
import { ExecutionsPage } from '@/routes/executions/index.tsx'
import { SchedulesPage } from '@/routes/schedules/index.tsx'

// Heavy routes — lazy loaded (CodeMirror + ReactFlow)
const OperationEditPage = lazy(() =>
  import('@/routes/operations/edit.tsx').then((m) => ({ default: m.OperationEditPage })),
)
const FlowEditPage = lazy(() =>
  import('@/routes/flows/edit.tsx').then((m) => ({ default: m.FlowEditPage })),
)
const BatchEditPage = lazy(() =>
  import('@/routes/batch/edit.tsx').then((m) => ({ default: m.BatchEditPage })),
)

function PageSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="flex flex-col gap-3 mt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    </div>
  )
}

const rootRoute = createRootRoute({
  component: Layout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/catalog' })
  },
})

const operationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog',
  component: () => (
    <ErrorBoundary>
      <OperationsPage />
    </ErrorBoundary>
  ),
})

const operationNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog/new',
  component: () => (
    <ErrorBoundary>
      <OperationNewPage />
    </ErrorBoundary>
  ),
})

const operationEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/catalog/$operationId',
  component: () => (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <OperationEditPage />
      </Suspense>
    </ErrorBoundary>
  ),
})

const flowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/flows',
  component: () => (
    <ErrorBoundary>
      <FlowsPage />
    </ErrorBoundary>
  ),
})

const flowNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/flows/new',
  component: () => (
    <ErrorBoundary>
      <FlowNewPage />
    </ErrorBoundary>
  ),
})

const flowEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/flows/$flowId',
  component: () => (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <FlowEditPage />
      </Suspense>
    </ErrorBoundary>
  ),
})

const environmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/environments',
  component: () => (
    <ErrorBoundary>
      <EnvironmentsPage />
    </ErrorBoundary>
  ),
})

const environmentNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/environments/new',
  component: () => (
    <ErrorBoundary>
      <EnvironmentNewPage />
    </ErrorBoundary>
  ),
})

const environmentEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/environments/$environmentId',
  component: () => (
    <ErrorBoundary>
      <EnvironmentEditPage />
    </ErrorBoundary>
  ),
})

const batchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/batch',
  component: () => (
    <ErrorBoundary>
      <BatchPage />
    </ErrorBoundary>
  ),
})

const batchNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/batch/new',
  component: () => (
    <ErrorBoundary>
      <BatchNewPage />
    </ErrorBoundary>
  ),
})

const batchEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/batch/$batchId',
  component: () => (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <BatchEditPage />
      </Suspense>
    </ErrorBoundary>
  ),
})

const executionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/executions',
  component: () => (
    <ErrorBoundary>
      <ExecutionsPage />
    </ErrorBoundary>
  ),
})

const schedulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedules',
  component: () => (
    <ErrorBoundary>
      <SchedulesPage />
    </ErrorBoundary>
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  operationsRoute,
  operationNewRoute,
  operationEditRoute,
  flowsRoute,
  flowNewRoute,
  flowEditRoute,
  environmentsRoute,
  environmentNewRoute,
  environmentEditRoute,
  batchRoute,
  batchNewRoute,
  batchEditRoute,
  executionsRoute,
  schedulesRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
