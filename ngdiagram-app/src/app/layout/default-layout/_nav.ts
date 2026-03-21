import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cilSpeedometer' },
  },
  {
    name: 'Domain Model',
    url: '/domain-model',
    iconComponent: { name: 'cilLayers' },
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
];
