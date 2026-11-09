const DEFAULT_API_URL = 'http://localhost:3000';

export function getApiBaseUrl() {
  const configured = localStorage.getItem('sportsApiUrl');

  return (configured || DEFAULT_API_URL).replace(/\/+$/, '');
}

export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet(path, options = {}) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError('API path must begin with /.');
  }

  const url = `${getApiBaseUrl()}${path}`;

  let response;

  try {
    response = await fetch(url, {
      method: 'GET',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(
      'Unable to connect to the SPORTPULSE API.'
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `API request failed: HTTP ${response.status}`,
      response.status
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError('The API returned invalid JSON.');
  }
}