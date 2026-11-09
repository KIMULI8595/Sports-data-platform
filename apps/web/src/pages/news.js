import { escapeHtml } from '../utils/html.js';
import { renderNewsCard } from '../components/news/news-card.js';
import {
  filterNews,
  sortNewsNewestFirst,
} from '../components/news/news-filters.js';

export function renderNewsPage(articles = [], state = {}) {
  const search = String(state.search ?? '');
  const filtered = sortNewsNewestFirst(
    filterNews(articles, search)
  );

  let content;

  if (!articles.length) {
    content = `
      <div class="news-empty-state" role="status">
        <div class="news-empty-icon" aria-hidden="true">▤</div>
        <h2>No news articles available yet</h2>
        <p>
          SPORTPULSE does not currently have a connected
          news feed. Verified sports updates will appear
          here when a news source is configured.
        </p>
        <span class="news-empty-label">
          News integration pending
        </span>
      </div>`;
  } else if (!filtered.length) {
    content = `
      <div class="news-empty-state" role="status">
        <div class="news-empty-icon" aria-hidden="true">⌕</div>
        <h2>No matching articles</h2>
        <p>Try another search term.</p>
      </div>`;
  } else {
    content = `
      <div class="news-grid">
        ${filtered.map(renderNewsCard).join('')}
      </div>`;
  }

  return `
    <div class="dashboard-page news-page">
      <header class="page-heading">
        <p class="page-eyebrow">SPORTPULSE / EDITORIAL</p>
        <h1>Sports News</h1>
        <p>
          Sports headlines, club updates, and competition
          coverage in one place.
        </p>
      </header>

      <section class="dashboard-section">
        <div class="news-toolbar">
          <div class="news-toolbar-heading">
            <h2>Latest Updates</h2>
            <span>${articles.length} articles</span>
          </div>

          ${articles.length
            ? `<label class="news-search-label">
                 <span>Search articles</span>
                 <input type="search"
                   data-news-search
                   placeholder="Search news..."
                   value="${escapeHtml(search)}">
               </label>`
            : ''}
        </div>

        <div data-news-content>
          ${content}
        </div>
      </section>

      <p class="news-disclaimer">
        SPORTPULSE displays only articles from configured
        sources. No headlines or reporting are generated
        to fill missing news data.
      </p>
    </div>
  `;
}

export function mountNews(container) {
  const articles = [];
  let search = '';

  function render() {
    container.innerHTML = renderNewsPage(articles, { search });
  }

  function handleInput(event) {
    if (!event.target.matches?.('[data-news-search]')) return;

    search = event.target.value;

    const output = container.querySelector('[data-news-content]');
    const filtered = sortNewsNewestFirst(filterNews(articles, search));

    if (output) {
      output.innerHTML = filtered.length
        ? `<div class="news-grid">
             ${filtered.map(renderNewsCard).join('')}
           </div>`
        : `<div class="news-empty-state" role="status">
             <h2>No matching articles</h2>
             <p>Try another search term.</p>
           </div>`;
    }
  }

  container.addEventListener('input', handleInput);
  render();

  return () => {
    container.removeEventListener('input', handleInput);
  };
}
