import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'register',
    renderMode: RenderMode.Prerender,
  },
  // Authenticated pages rely on browser-only APIs (localStorage, charts),
  // so render them on the client to avoid SSR/prerender errors.
  {
    path: 'dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'income',
    renderMode: RenderMode.Client,
  },
  {
    path: 'expenses',
    renderMode: RenderMode.Client,
  },
  {
    path: 'budget',
    renderMode: RenderMode.Client,
  },
  {
    path: 'savings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reports',
    renderMode: RenderMode.Client,
  },
  {
    path: 'settings',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  }
];
