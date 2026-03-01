import type { ColumnPath, SortDirection } from './types';
import { PaginateQueryBuilder } from './builder';

/**
 * Parse a nestjs-paginate query string into a {@link PaginateQueryBuilder}.
 * Supports all standard query params: `page`, `limit`, `sortBy`, `search`, `searchBy`,
 * `select`, `cursor`, `withDeleted`, and `filter.<column>`.
 *
 * The resulting builder can be further modified or serialized via `.toParams()` / `.toQueryString()`.
 *
 * @param qs - Query string, with or without a leading `?`.
 * @returns A pre-populated {@link PaginateQueryBuilder}<T>.
 *
 * @example
 * ```ts
 * const builder = fromQueryString<User>('?page=2&filter.name=%24eq%3AJohn');
 * builder.limit(10).toQueryString();
 * ```
 */
export function fromQueryString<T extends Record<string, unknown>>(
  qs: string,
): PaginateQueryBuilder<T> {
  const builder = new PaginateQueryBuilder<T>();
  const queryStr = qs.startsWith('?') ? qs.slice(1) : qs;
  if (!queryStr) return builder;

  const searchByValues: string[] = [];
  const filterMap: Record<string, string[]> = {};

  for (const pair of queryStr.split('&')) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = decodeURIComponent(pair.slice(0, eqIdx));
    const val = decodeURIComponent(pair.slice(eqIdx + 1));

    if (key === 'page') {
      const n = parseInt(val, 10);
      if (!isNaN(n)) builder.page(n);
    } else if (key === 'limit') {
      const n = parseInt(val, 10);
      if (!isNaN(n)) builder.limit(n);
    } else if (key === 'sortBy') {
      const colonIdx = val.lastIndexOf(':');
      if (colonIdx !== -1) {
        const col = val.slice(0, colonIdx) as ColumnPath<T>;
        const dir = val.slice(colonIdx + 1) as SortDirection;
        builder.sortBy(col, dir);
      }
    } else if (key === 'search') {
      builder.search(val);
    } else if (key === 'searchBy') {
      searchByValues.push(val);
    } else if (key === 'select') {
      builder.select(val.split(',') as ColumnPath<T>[]);
    } else if (key === 'cursor') {
      builder.cursor(val);
    } else if (key === 'withDeleted') {
      builder.withDeleted(val === 'true');
    } else if (key.startsWith('filter.')) {
      const col = key.slice('filter.'.length);
      if (!filterMap[col]) filterMap[col] = [];
      filterMap[col].push(val);
    }
  }

  if (searchByValues.length) builder.searchBy(searchByValues as ColumnPath<T>[]);
  for (const [col, values] of Object.entries(filterMap)) {
    builder.filter(col as ColumnPath<T>, values);
  }

  return builder;
}
