const navigationIcons = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
  fixtures: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  competitions: '<path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4ZM7 6H4v3a4 4 0 0 0 4 4M17 6h3v3a4 4 0 0 1-4 4"/>',
  teams: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  players: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5v1"/>',
  analytics: '<path d="M4 20V11M10 20V5M16 20v-8M22 20V8M2 20h22"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h6M7 12h6M7 16h10M16 8h2v4h-2z"/>',
  favorites: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 2-.06-.06A1.7 1.7 0 0 0 15.9 18l-.1.04V21h-3v-.09a1.7 1.7 0 0 0-1.2-1.6l-.1-.03a1.7 1.7 0 0 0-1.8.4l-.06.06-2-2 .06-.06A1.7 1.7 0 0 0 8 15.9l-.04-.1H5v-3h.09a1.7 1.7 0 0 0 1.6-1.2l.03-.1a1.7 1.7 0 0 0-.4-1.8l-.06-.06 2-2 .06.06A1.7 1.7 0 0 0 10.1 8l.1-.04V5h3v.09a1.7 1.7 0 0 0 1.2 1.6l.1.03a1.7 1.7 0 0 0 1.8-.4l.06-.06 2 2-.06.06A1.7 1.7 0 0 0 18 10.1l.04.1H21v3h-.09a1.7 1.7 0 0 0-1.6 1.2Z"/>',
};

function renderNavigationIcon(name) {
  const paths = navigationIcons[name] || navigationIcons.dashboard;

  return `
    <svg class="nav-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false">
      ${paths}
    </svg>
  `;
}
const navigation = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/', icon: 'dashboard' },
      { label: 'Live Scores', path: '/live', icon: 'live' },
      { label: 'Fixtures & Results', path: '/fixtures', icon: 'fixtures' },
      { label: 'Competitions', path: '/competitions', icon: 'competitions' },
    ],
  },
  {
    title: 'EXPLORE',
    items: [
      { label: 'Teams', path: '/teams', icon: 'teams' },
      { label: 'Players', path: '/players', icon: 'players' },
      { label: 'Statistics & Analytics', path: '/analytics', icon: 'analytics' },
      { label: 'Sports News', path: '/news', icon: 'news' },
    ],
  },
  {
    title: 'PERSONAL',
    items: [
      { label: 'My Favorites', path: '/favorites', icon: 'favorites' },
      { label: 'Notifications', path: '/notifications', icon: 'notifications' },
      { label: 'My Account', path: '/settings', icon: 'settings' },
    ],
  },
];

function renderNavigation() {
  return navigation.map(group => `
    <div class="nav-group">
      <h2 class="nav-group-title">${group.title}</h2>
      <nav aria-label="${group.title}">
        ${group.items.map(item => `
          <a href="${item.path}" data-link class="nav-link">
            ${renderNavigationIcon(item.icon)}
            <span class="nav-label">${item.label}</span>
          </a>
        `).join('')}
      </nav>
    </div>
  `).join('');
}

export function renderShell() {
  return `
    <div class="app-layout">
      <aside class="app-sidebar" aria-label="Main sidebar">
        <a href="/" data-link class="app-brand">
          <span class="brand-mark" aria-hidden="true">SP</span>
          <span>SPORTPULSE</span>
        </a>

        ${renderNavigation()}
      </aside>

      <div class="app-workspace">
        <header class="app-topbar">
          <div class="topbar-brand">SPORTPULSE</div>

          <div class="topbar-actions">
            <span id="api-status" role="status">
              Connecting...
            </span>
          </div>
        </header>

        <main id="app-content" tabindex="-1">
        </main>
      </div>

      <nav class="mobile-navigation" aria-label="Mobile navigation">
        <a href="/" data-link>${renderNavigationIcon("dashboard")}<span>Home</span></a>
        <a href="/live" data-link>${renderNavigationIcon("live")}<span>Live</span></a>
        <a href="/fixtures" data-link>${renderNavigationIcon("fixtures")}<span>Fixtures</span></a>
        <a href="/favorites" data-link>${renderNavigationIcon("favorites")}<span>Saved</span></a>
        <details class="mobile-more" id="mobile-more">
  <summary class="mobile-more-trigger">
    ${renderNavigationIcon("settings")}
    <span>More</span>
  </summary>
  <div class="mobile-more-panel" aria-label="More destinations">
    <div class="mobile-more-heading">Explore SPORTPULSE</div>
    <div class="mobile-more-grid">
      ${navigation.flatMap(group => group.items)
        .filter(item => !['/', '/live', '/fixtures', '/favorites'].includes(item.path))
        .map(item => `
          <a href="${item.path}" data-link class="mobile-more-link">
            ${renderNavigationIcon(item.icon)}
            <span>${item.label}</span>
          </a>
        `).join('')}
    </div>
  </div>
</details>
      </nav>
    </div>
  `;
}

let mobileMoreListenersInstalled = false;

function setupMobileMoreMenu() {
  if (mobileMoreListenersInstalled) return;

  mobileMoreListenersInstalled = true;

  document.addEventListener('click', event => {
    const menu = document.getElementById('mobile-more');
    if (!menu?.open) return;

    if (!menu.contains(event.target)) {
      menu.open = false;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    const menu = document.getElementById('mobile-more');
    if (!menu?.open) return;

    menu.open = false;
    menu.querySelector('summary')?.focus();
  });
}

export function updateActiveNavigation(pathname) {
  setupMobileMoreMenu();

  const mobileMore = document.getElementById('mobile-more');

  if (mobileMore) {
    mobileMore.open = false;

    const morePaths = [
      '/competitions',
      '/teams',
      '/players',
      '/analytics',
      '/news',
      '/notifications',
      '/settings'
    ];

    mobileMore.classList.toggle(
      'active',
      morePaths.includes(pathname)
    );
  }
  document.querySelectorAll('[data-link]').forEach(link => {
    const isActive =
      link.getAttribute('href') === pathname ||
      (pathname === '/dashboard' &&
       link.getAttribute('href') === '/');

    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

export async function updateApiStatus() {
  const element = document.getElementById('api-status');
  if (!element) return;

  element.textContent = 'Checking API...';

  const configured = localStorage.getItem('sportsApiUrl');
  const baseUrl = (configured || 'http://localhost:3000')
    .replace(/\/+$/, '');

  try {
    const response = await fetch(`${baseUrl}/matches`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    element.textContent = 'API Connected';
    element.style.color = '#22C55E';
  } catch {
    element.textContent = 'API Unavailable';
    element.style.color = '#EF4444';
  }
}