export function filterNews(articles, search = '') {
  if (!Array.isArray(articles)) return [];

  const query = String(search).trim().toLowerCase();

  if (!query) return [...articles];

  return articles.filter(article => {
    const searchable = [
      article.title,
      article.summary,
      article.description,
      article.source?.name,
      typeof article.source === 'string' ? article.source : '',
    ].filter(Boolean).join(' ').toLowerCase();

    return searchable.includes(query);
  });
}

export function sortNewsNewestFirst(articles) {
  if (!Array.isArray(articles)) return [];

  return [...articles].sort((a, b) => {
    const first = Date.parse(a.publishedAt ?? '');
    const second = Date.parse(b.publishedAt ?? '');

    const aTime = Number.isFinite(first) ? first : -Infinity;
    const bTime = Number.isFinite(second) ? second : -Infinity;

    return bTime - aTime;
  });
}
