import { escapeHtml } from '../utils/html.js';
import { renderSettingsSection } from
  '../components/settings/settings-section.js';

import {
  DEFAULT_API_URL,
  getConfiguredApiUrl,
  getEffectiveApiUrl,
  validateApiUrl,
  saveApiUrl,
  resetApiUrl,
  getPreferences,
  saveNotificationPreference,
  getBrowserDataSummary,
} from '../services/settings.js';

import { updateApiStatus } from '../app/shell.js';

export function renderSettingsPage(
  apiUrl = getEffectiveApiUrl(),
  preferences = getPreferences(),
  summary = getBrowserDataSummary()
) {
  const apiSection = renderSettingsSection({
    id: 'api',
    title: 'API Connection',
    description: 'Configure the data source used by SPORTPULSE.',
    content: `
      <form id="settings-api-form" class="settings-form">
        <label for="settings-api-url">API base URL</label>
        <div class="settings-input-row">
          <input
            id="settings-api-url"
            type="url"
            required
            spellcheck="false"
            autocomplete="off"
            value="${escapeHtml(apiUrl)}"
          >
          <button type="submit">Save URL</button>
        </div>
        <p class="settings-help">
          Default: ${escapeHtml(DEFAULT_API_URL)}.
          HTTPS endpoints and local HTTP endpoints are supported.
          A different endpoint must support the SPORTPULSE API
          and allow requests from this browser.
        </p>
        <button type="button"
          class="settings-secondary-button"
          data-settings-reset-api>
          Restore default
        </button>
      </form>
    `,
  });

  const appearanceSection = renderSettingsSection({
    id: 'appearance',
    title: 'Appearance',
    description: 'SPORTPULSE visual preferences.',
    content: `
      <div class="settings-option-row">
        <div>
          <strong>Midnight Navy</strong>
          <p>Dark interface with SPORTPULSE gold accents.</p>
        </div>
        <span class="settings-status-pill">Active</span>
      </div>
      <p class="settings-help">
        Dark mode is the currently supported appearance.
        Light mode is not yet implemented.
      </p>
    `,
  });

  const notificationsSection = renderSettingsSection({
    id: 'notifications',
    title: 'Notification Preferences',
    description: 'Store your preference in this browser.',
    content: `
      <form id="settings-notification-form" class="settings-form">
        <label for="settings-notification-preference">
          Preferred notification experience
        </label>
        <div class="settings-input-row">
          <select id="settings-notification-preference">
            <option value="in-app"
              ${preferences.notificationPreference === 'in-app'
                ? 'selected' : ''}>
              In-app notifications preferred
            </option>
            <option value="off"
              ${preferences.notificationPreference === 'off'
                ? 'selected' : ''}>
              Notifications not preferred
            </option>
          </select>
          <button type="submit">Save preference</button>
        </div>
        <p class="settings-help">
          This preference is saved locally for future integration.
          It does not enable or disable a live notification feed,
          browser push messages, or server-side delivery.
        </p>
      </form>
    `,
  });

  const privacySection = renderSettingsSection({
    id: 'privacy',
    title: 'Browser Data & Privacy',
    description: 'Information saved in this browser.',
    content: `
      <div class="settings-data-grid">
        <div>
          <strong>${summary.favoriteTeams}</strong>
          <span>Favorite teams</span>
        </div>
        <div>
          <strong>${summary.favoriteMatches}</strong>
          <span>Favorite matches</span>
        </div>
        <div>
          <strong>${summary.notifications}</strong>
          <span>Stored notifications</span>
        </div>
      </div>
      <p class="settings-help">
        Favorites, notification records, and preferences are
        stored in browser localStorage. They are not synchronized
        across devices. Clearing browser site data may remove them.
      </p>
    `,
  });

  const accountSection = renderSettingsSection({
    id: 'account',
    title: 'My Account',
    description: 'Current account capabilities.',
    content: `
      <div class="settings-option-row">
        <div>
          <strong>Local preview</strong>
          <p>
            Authentication, user profiles, and account
            synchronization are not connected in this frontend.
          </p>
        </div>
        <span class="settings-status-pill">Local only</span>
      </div>
    `,
  });

  return `
    <div class="dashboard-page settings-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / PERSONAL</p>
        <h1>Settings &amp; Account</h1>
        <p>Manage local preferences and API configuration.</p>
      </header>

      <div class="settings-content">
        ${apiSection}
        ${appearanceSection}
        ${notificationsSection}
        ${privacySection}
        ${accountSection}
      </div>

      <p id="settings-feedback"
        class="settings-feedback"
        role="status"
        aria-live="polite"></p>
    </div>
  `;
}

export function mountSettings(container) {
  let active = true;

  container.innerHTML = renderSettingsPage();

  const feedback = container.querySelector('#settings-feedback');

  function showFeedback(message, success = true) {
    if (!active) return;
    feedback.textContent = message;
    feedback.dataset.status = success ? 'success' : 'error';
  }

  async function handleSubmit(event) {
    if (event.target.id === 'settings-api-form') {
      event.preventDefault();

      const input = container.querySelector('#settings-api-url');
      const value = validateApiUrl(input.value);

      if (!value) {
        showFeedback(
          'Enter a valid HTTPS URL or local HTTP API URL.',
          false
        );
        return;
      }

      if (!saveApiUrl(value)) {
        showFeedback('Unable to save the API URL.', false);
        return;
      }

      input.value = value;
      showFeedback('API URL saved. Future requests use this endpoint.');
      await updateApiStatus();
      return;
    }

    if (event.target.id === 'settings-notification-form') {
      event.preventDefault();

      const input = container.querySelector(
        '#settings-notification-preference'
      );

      if (saveNotificationPreference(input.value)) {
        showFeedback('Notification preference saved locally.');
      } else {
        showFeedback('Unable to save notification preference.', false);
      }
    }
  }

  async function handleClick(event) {
    if (!event.target.closest?.('[data-settings-reset-api]')) return;

    if (!resetApiUrl()) {
      showFeedback('Unable to reset the API URL.', false);
      return;
    }

    container.querySelector('#settings-api-url').value =
      DEFAULT_API_URL;

    showFeedback('Default API URL restored.');
    await updateApiStatus();
  }

  container.addEventListener('submit', handleSubmit);
  container.addEventListener('click', handleClick);

  return () => {
    active = false;
    container.removeEventListener('submit', handleSubmit);
    container.removeEventListener('click', handleClick);
  };
}
