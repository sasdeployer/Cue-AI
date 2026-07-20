import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import './index.css';
import Landing from './routes/Landing';
import Builder from './routes/Builder';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing,
});

interface BuildSearch {
  prompt?: string;
  deckId?: string;
}

const buildRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/build',
  validateSearch: (search: Record<string, unknown>): BuildSearch => ({
    prompt: typeof search.prompt === 'string' ? search.prompt : undefined,
    deckId: typeof search.deckId === 'string' ? search.deckId : undefined,
  }),
  component: Builder,
});

const routeTree = rootRoute.addChildren([indexRoute, buildRoute]);

const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
