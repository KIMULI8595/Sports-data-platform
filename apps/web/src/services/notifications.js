const STORAGE_KEY = 'sportpulse:notifications:v1';
const MAX_ITEMS = 200;

function cleanNotification(item) {
  if (!item || typeof item !== 'object') return null;

  const id = String(item.id ?? '').trim();
  const title = String(item.title ?? '').trim();

  if (!id || !title) return null;

  const date = Date.parse(item.createdAt ?? '');
  const url = String(item.url ?? '');

  return {
    id,
    title: title.slice(0, 200),
    message: String(item.message ?? '').slice(0, 1000),
    type: ['match', 'team', 'system'].includes(item.type)
      ? item.type
      : 'system',
    createdAt: Number.isFinite(date)
      ? new Date(date).toISOString()
      : null,
    read: item.read === true,
    url: /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(url) ? url : '',
  };
}

export function getNotifications() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    const seen = new Set();

    return parsed
      .map(cleanNotification)
      .filter(item => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveNotifications(items) {
  try {
    if (!globalThis.localStorage) return false;

    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS))
    );

    return true;
  } catch {
    return false;
  }
}

export function addNotification(notification) {
  const item = cleanNotification(notification);
  if (!item) return false;

  const existing = getNotifications();
  const withoutDuplicate = existing.filter(
    entry => entry.id !== item.id
  );

  return saveNotifications([item, ...withoutDuplicate]);
}

export function markNotificationRead(id) {
  const items = getNotifications();
  const item = items.find(entry => entry.id === String(id));

  if (!item) return false;

  item.read = true;
  return saveNotifications(items);
}

export function markAllNotificationsRead() {
  const items = getNotifications();

  for (const item of items) {
    item.read = true;
  }

  return saveNotifications(items);
}

export function removeNotification(id) {
  const items = getNotifications();
  const remaining = items.filter(
    item => item.id !== String(id)
  );

  if (remaining.length === items.length) return false;
  return saveNotifications(remaining);
}

export function getUnreadCount() {
  return getNotifications().filter(item => !item.read).length;
}
