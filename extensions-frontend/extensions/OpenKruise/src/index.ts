import routes from './routes';
import locales from './locales';

const menus = [
  {
    parent: 'topbar',
    name: 'OpenKruise',
    title: 'OpenKruise Dashboard',
    icon: 'cluster',
    order: 0,
    desc: 'Automate application management on Kubernetes.',
    skipAuth: true,
  },
];

const extensionConfig = {
  routes,
  menus,
  locales,
};

export default extensionConfig;
