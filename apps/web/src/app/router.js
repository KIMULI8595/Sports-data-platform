const routes = new Map([
  ['/', 'dashboard'],
  ['/dashboard', 'dashboard'],
  ['/live', 'live'],
  ['/fixtures', 'fixtures'],
  ['/competitions', 'competitions'],
  ['/teams', 'teams'],
  ['/players', 'players'],
  ['/analytics', 'analytics'],
  ['/news', 'news'],
  ['/favorites', 'favorites'],
  ['/notifications', 'notifications'],
  ['/settings', 'settings'],
]);

export function resolveRoute(pathname = window.location.pathname) {
  const normalized = pathname.length > 1
    ? pathname.replace(/\/+$/, '')
    : pathname;

  const preview = normalized === '/preview.html' ||
    normalized === '/preview' ||
    normalized.startsWith('/preview/');

  const routePath = normalized === '/preview.html' ||
    normalized === '/preview'
      ? '/'
      : preview
        ? normalized.slice('/preview'.length) || '/'
        : normalized;

  if (routes.has(routePath)) {
    return {
      name: routes.get(routePath),
      pathname: routePath,
      params: {},
      preview,
    };
  }

  const match = routePath.match(/^\/matches\/([^/]+)$/);

  if (match) {
    return {
      name: 'match-center',
      pathname: routePath,
      params: { id: match[1] },
      preview,
    };
  }

  return {
    name: 'not-found',
    pathname: routePath,
    params: {},
    preview,
  };
}

export function navigate(pathname) {
  const target = new URL(pathname, window.location.origin);

  if (target.origin !== window.location.origin) {
    throw new Error('External navigation is not supported.');
  }

  const current = resolveRoute();

  if (
    current.preview &&
    !target.pathname.startsWith('/preview/') &&
    target.pathname !== '/preview.html' &&
    target.pathname !== '/preview'
  ) {
    target.pathname = '/preview' + target.pathname;
  }

  const destination = target.pathname + target.search + target.hash;
  const currentUrl = window.location.pathname +
    window.location.search + window.location.hash;

  if (destination !== currentUrl) {
    window.history.pushState({}, '', destination);
  }

  window.dispatchEvent(new Event('sportpulse:navigate'));
}

export function initializeRouter(onRouteChange) {
  if (typeof onRouteChange !== 'function') {
    throw new TypeError('A route change callback is required.');
  }

  const handleRouteChange = () => {
    onRouteChange(resolveRoute());
  };

  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('sportpulse:navigate', handleRouteChange);

  handleRouteChange();

  return () => {
    window.removeEventListener('popstate', handleRouteChange);
    window.removeEventListener(
      'sportpulse:navigate',
      handleRouteChange
    );
  };
}