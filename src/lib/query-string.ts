import type { PaginateParamsRaw } from './types';

/**
 * original
 * Serialize params to a query string compatible with nestjs-paginate.
 * Repeated keys (e.g. sortBy, searchBy) are emitted as multiple key=value pairs.
 */
// export function toQueryString(params: PaginateParamsRaw): string {
//   const pairs: string[] = [];

//   for (const [key, val] of Object.entries(params)) {
//     if (val === undefined || val === null) {
//       continue;
//     }

//     if (Array.isArray(val)) {
//       for (const v of val) {
//         if (v !== undefined && v !== null && v !== '') {
//           pairs.push(
//             `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`,
//           );
//         }
//       }
//     } else if (val !== '') {
//       pairs.push(
//         `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`,
//       );
//     }
//   }

//   return pairs.length ? `?${pairs.join('&')}` : '';
// }

/**
 * Serialize params to a query string compatible with nestjs-paginate.
 * Repeated keys (e.g. sortBy, searchBy) are emitted as multiple key=value pairs.
 * Option A (clean + fast): Object.keys().flatMap()
 */
const toQueryStringA = (params: PaginateParamsRaw): string => {
  const pairs = Object.keys(params).flatMap((key) => {
    const val = (params as Record<string, unknown>)[key];

    if (val === undefined || val === null) {
      return [];
    }

    const pushPair = (v: unknown): string[] =>
      v === undefined || v === null || v === ''
        ? []
        : [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];

    return Array.isArray(val) ? val.flatMap(pushPair) : pushPair(val);
  });

  return pairs.length ? `?${pairs.join('&')}` : '';
};

// Option B (most “ES5-safe”): reduce + concat (no flatMap)
/**
 * Serialize params to a query string compatible with nestjs-paginate.
 * Repeated keys (e.g. sortBy, searchBy) are emitted as multiple key=value pairs.
 */
const toQueryStringB = (params: PaginateParamsRaw): string => {
  const pairs = Object.keys(params).reduce<string[]>((acc, key) => {
    const val = (params as Record<string, unknown>)[key];

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

export { toQueryStringB as toQueryString };
