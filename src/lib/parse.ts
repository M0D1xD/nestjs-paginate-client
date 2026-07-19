import { PaginateQueryBuilder } from './builder';
import type { ColumnPath, SortDirection } from './types';

/**
 * Parse a nestjs-paginate query string into a {@link PaginateQueryBuilder}.
 * Supports: `page`, `limit`, `sortBy`, `search`, `searchBy`, `select`, `cursor`,
 * `withDeleted`, `filter.<column>`, and boolean `filter=`.
 */
export const fromQueryString = <T extends Record<string, unknown>>(
  qs: string,
): PaginateQueryBuilder<T> => {
  const builder = new PaginateQueryBuilder<T>();
  const queryStr = qs.startsWith('?') ? qs.slice(1) : qs;
  const decodeQueryComponent = (value: string): string | null => {
    try {
      return decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      return null;
    }
  };

  if (!queryStr) {
    return builder;
  }

  const searchByValues: string[] = [];
  const filterMap: Record<string, string[]> = {};
  let filterExpression: string | undefined;

  queryStr
    .split('&')
    .filter(Boolean)
    .forEach((pair) => {
      const eqIdx = pair.indexOf('=');

      if (eqIdx === -1) {
        return;
      }

      const key = decodeQueryComponent(pair.slice(0, eqIdx));
      const val = decodeQueryComponent(pair.slice(eqIdx + 1));

      if (key === null || val === null) {
        return;
      }

      if (key === 'page') {
        const n = Number.parseInt(val, 10);
        if (!Number.isNaN(n)) {
          builder.page(n);
        }
        return;
      }

      if (key === 'limit') {
        const n = Number.parseInt(val, 10);
        if (!Number.isNaN(n)) {
          builder.limit(n);
        }
        return;
      }

      if (key === 'sortBy') {
        const colonIdx = val.lastIndexOf(':');
        if (colonIdx !== -1) {
          const col = val.slice(0, colonIdx) as ColumnPath<T>;
          const dir = val.slice(colonIdx + 1) as SortDirection;
          builder.sortBy(col, dir);
        }
        return;
      }

      if (key === 'search') {
        builder.search(val);
        return;
      }

      if (key === 'searchBy') {
        searchByValues.push(val);
        return;
      }

      if (key === 'select') {
        builder.select(val.split(',') as ColumnPath<T>[]);
        return;
      }

      if (key === 'cursor') {
        builder.cursor(val);
        return;
      }

      if (key === 'withDeleted') {
        builder.withDeleted(val === 'true');
        return;
      }

      // Boolean filter expression (`filter=...`), not `filter.<column>`
      if (key === 'filter') {
        filterExpression = val;
        return;
      }

      if (key.startsWith('filter.')) {
        const col = key.slice('filter.'.length);
        (filterMap[col] ??= []).push(val);
      }
    });

  if (searchByValues.length) {
    builder.searchBy(searchByValues as ColumnPath<T>[]);
  }

  Object.keys(filterMap).forEach((col) => {
    const tokens = filterMap[col];
    builder.filter(col as ColumnPath<T>, tokens.length === 1 ? tokens[0] : tokens);
  });

  if (filterExpression !== undefined) {
    builder.filterExpression(filterExpression);
  }

  return builder;
};

/**
 * Parse a full URL (or path + query) into a {@link PaginateQueryBuilder}.
 */
export const fromUrl = <T extends Record<string, unknown>>(
  url: string,
): PaginateQueryBuilder<T> => {
  try {
    const parsed = new URL(url, 'http://localhost');
    return fromQueryString<T>(parsed.search);
  } catch {
    const qIdx = url.indexOf('?');
    if (qIdx === -1) {
      return fromQueryString<T>('');
    }
    return fromQueryString<T>(url.slice(qIdx));
  }
};
