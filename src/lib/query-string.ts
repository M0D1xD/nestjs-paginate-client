import type { PaginateParamsRaw } from './types';

/**
 * Serialize params to a query string compatible with nestjs-paginate.
 * Repeated keys (e.g. sortBy, searchBy) are emitted as multiple key=value pairs.
 */
export function toQueryString(params: PaginateParamsRaw): string {
  const pairs: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      for (const v of val) {
        if (v !== undefined && v !== null && v !== '')
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
      }
    } else if (val !== '') {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return pairs.length ? `?${pairs.join('&')}` : '';
}
