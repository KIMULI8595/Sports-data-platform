import { escapeHtml } from '../../utils/html.js';

export function renderNewsCard(article) {
  const title = String(article.title ?? 'Untitled article');
  const summary = String(article.summary ?? article.description ?? '');
  const source = String(article.source?.name ?? article.source ?? 'Unknown source');
  const url = String(article.url ?? '');
  const image = String(article.imageUrl ?? '');
  const published = article.publishedAt
    ? new Date(article.publishedAt)
    : null;

  const dateLabel = published && !Number.isNaN(published.getTime())
    ? published.toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date unavailable';

  const safeUrl = /^https:\/\//i.test(url) ? url : '';
  const safeImage = /^https:\/\//i.test(image) ? image : '';

  return `
    <article class="news-card">
      ${safeImage
        ? `<img class="news-card-image"
             src="${escapeHtml(safeImage)}"
             alt=""
             loading="lazy">`
        : `<div class="news-card-image-placeholder"
             aria-hidden="true">SPORTPULSE</div>`}

      <div class="news-card-body">
        <div class="news-card-meta">
          <span>${escapeHtml(source)}</span>
          <span>${escapeHtml(dateLabel)}</span>
        </div>

        <h2>${escapeHtml(title)}</h2>
        ${summary ? `<p>${escapeHtml(summary)}</p>` : ''}

        ${safeUrl
          ? `<a href="${escapeHtml(safeUrl)}"
               target="_blank"
               rel="noopener noreferrer">
               Read article
             </a>`
          : ''}
      </div>
    </article>
  `;
}
