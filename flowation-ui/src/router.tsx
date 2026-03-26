import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from '@tanstack/react-router'
import { Layout } from '@/components/layout.tsx'
import { ErrorBoundary } from '@/components/error-boundary.tsx'
import { OperationsPage } from '@/routes/operations/index.tsx'
import { OperationNewPage } from '@/routes/operations/new.tsx'
import { OperationEditPage } from '@/routes/operations/edit.tsx'

const rootRoute = createRootRoute({
  component: Layout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/operations' })
  },
})

const operationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/operations',
  component: () => (
    <ErrorBoundary>
      <OperationsPage />
    </ErrorBoundary>
  ),
})

const operationNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/operations/new',
  component: () => (
    <ErrorBoundary>
      <OperationNewPage />
    </ErrorBoundary>
  ),
})

const operationEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/operations/$operationId',
  component: () => (
    <ErrorBoundary>
      <OperationEditPage />
    </ErrorBoundary>
  ),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  operationsRoute,
  operationNewRoute,
  operationEditRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
