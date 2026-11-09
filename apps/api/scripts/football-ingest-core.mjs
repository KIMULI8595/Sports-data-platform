export const PROVIDER = 'API_FOOTBALL';
export const DAILY_LIMIT = 100;
export function slug(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'unknown'; }
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')); }
export function normalizeStatus(short) { return ({NS:'scheduled',TBD:'scheduled',PST:'postponed',CANC:'cancelled',SUSP:'suspended',INT:'suspended',FT:'finished',AET:'finished',PEN:'finished',HT:'half_time', '1H':'live', '2H':'live',ET:'live',P:'live',BT:'live',LIVE:'live'})[short] || 'scheduled'; }
export function quotaAllowed(used, budget, requested=1) { return Number.isInteger(used) && Number.isInteger(budget) && budget >= 0 && used + requested <= Math.min(budget, DAILY_LIMIT); }
export function fixtureWindow(now = new Date()) { const d = new Date(now); const end = new Date(d); end.setUTCDate(end.getUTCDate()+1); return [d.toISOString().slice(0,10),end.toISOString().slice(0,10)]; }
