import type { PaginateParamsRaw } from './types';

/**
 * Serialize params to a query string compatible with nestjs-paginate.
 * Repeated keys (e.g. sortBy, searchBy) are emitted as multiple key=value pairs.
 */
export const toQueryString = (params: PaginateParamsRaw): string => {
  const pairs = Object.keys(params).reduce<string[]>((acc, key) => {
    const val = params[key];

    if (val === undefined || val === null) {
      return acc;
    }

    const add = (v: unknown): void => {
      if (v === undefined || v === null || v === '') {
        return;
      }
      acc.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    };

    if (Array.isArray(val)) {
      val.forEach(add);
    } else {
      add(val);
    }

    return acc;
  }, []);

  return pairs.length ? `?${pairs.join('&')}` : '';
};
