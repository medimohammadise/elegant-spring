import { Routes } from '@angular/router';
import { DefaultLayoutComponent } from './layout/default-layout/default-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: DefaultLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./views/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: {
          title: 'Dashboard',
        },
      },
      {
        path: 'domain-model',
        loadComponent: () =>
          import('./pages/domain-model/domain-model-page.component').then(
            (m) => m.DomainModelPageComponent,
          ),
        data: {
          title: 'Domain Model',
        },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/placeholder/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Users',
          pageTitle: 'Users',
          pageSummary: 'CoreUI placeholder page for the users section.',
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/placeholder/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Settings',
          pageTitle: 'Settings',
          pageSummary: 'CoreUI placeholder page for the settings section.',
        },
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
