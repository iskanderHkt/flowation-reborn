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
import { FlowsPage } from '@/routes/flows/index.tsx'
import { FlowNewPage } from '@/routes/flows/new.tsx'
import { FlowEditPage } from '@/routes/flows/edit.tsx'
import { EnvironmentsPage } from '@/routes/environments/index.tsx'
import { EnvironmentNewPage } from '@/routes/environments/new.tsx'
import { EnvironmentEditPage } from '@/routes/environments/edit.tsx'
import { BatchPage } from '@/routes/batch/index.tsx'
import { BatchNewPage } from '@/routes/batch/new.tsx'
import { BatchEditPage } from '@/routes/batch/edit.tsx'

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
      <OperationEditPage />
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
      <FlowEditPage />
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
      <BatchEditPage />
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
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
