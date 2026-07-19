import { fromQueryString } from 'nestjs-paginate-client';
import type { PaginatedResponse, SortDirection } from 'nestjs-paginate-client';
import { USERS } from './data';
import type { User } from './data';

/**
 * A tiny in-browser stand-in for a nestjs-paginate backend.
 *
 * It parses the query string with the library's own `fromQueryString`, applies
 * filter / search / sort / pagination to the in-memory dataset, and answers with
 * the exact `PaginatedResponse` shape a real backend returns. It implements the
 * subset of operators the demo UI produces — it is not a full reimplementation
 * of nestjs-paginate.
 */

const SEARCHABLE_COLUMNS = ['firstName', 'lastName', 'email'];
const DEFAULT_LIMIT = 20;

const getPath = (row: User, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
      row,
    );

/** Numeric compare when the field is a number, string compare otherwise (ISO dates sort fine as strings). */
const compare = (raw: unknown, value: string): number => {
  if (typeof raw === 'number' && !Number.isNaN(Number(value))) {
    return raw - Number(value);
  }
  return String(raw) < value ? -1 : String(raw) > value ? 1 : 0;
};

/** Evaluate one `filter.<column>` token, e.g. `$gte:30`, `$not:$in:admin,editor`, `$ilike:ann`. */
const matchesToken = (raw: unknown, token: string): boolean => {
  let rest = token;

  // The mock dataset has no to-many relations, so quantifiers are stripped and ignored.
  for (const quantifier of ['$any:', '$all:', '$none:']) {
    if (rest.startsWith(quantifier)) {
      rest = rest.slice(quantifier.length);
    }
  }

  if (rest.startsWith('$not:')) {
    return !matchesToken(raw, rest.slice('$not:'.length));
  }

  const sep = rest.indexOf(':');
  const op = sep === -1 ? rest : rest.slice(0, sep);
  const value = sep === -1 ? '' : rest.slice(sep + 1);

  switch (op) {
    case '$null':
      return raw === null || raw === undefined;
    case '$eq':
      return String(raw) === value;
    case '$gt':
      return compare(raw, value) > 0;
    case '$gte':
      return compare(raw, value) >= 0;
    case '$lt':
      return compare(raw, value) < 0;
    case '$lte':
      return compare(raw, value) <= 0;
    case '$btw': {
      const [min, max] = value.split(',');
      return compare(raw, min) >= 0 && compare(raw, max) <= 0;
    }
    case '$in':
      return value.split(',').includes(String(raw));
    case '$ilike':
      return String(raw).toLowerCase().includes(value.toLowerCase());
    case '$sw':
      return String(raw).toLowerCase().startsWith(value.toLowerCase());
    case '$contains':
      return Array.isArray(raw) && value.split(',').every((v) => raw.map(String).includes(v));
    default:
      return true;
  }
};

export const paginateUsers = (queryString: string): PaginatedResponse<User> => {
  const builder = fromQueryString<User>(queryString);
  const params = builder.toParams();

  let rows = USERS.slice();

  // `filter.<column>` params — every token for a column must match (AND semantics).
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith('filter.')) {
      continue;
    }
    const column = key.slice('filter.'.length);
    const tokens = Array.isArray(value) ? value : [value];
    rows = rows.filter((row) => tokens.every((token) => matchesToken(getPath(row, column), token)));
  }

  const search = typeof params['search'] === 'string' ? params['search'].toLowerCase() : undefined;
  if (search) {
    const columns = Array.isArray(params['searchBy']) ? params['searchBy'] : SEARCHABLE_COLUMNS;
    rows = rows.filter((row) =>
      columns.some((col) => String(getPath(row, col)).toLowerCase().includes(search)),
    );
  }

  const sortBy = (Array.isArray(params['sortBy']) ? params['sortBy'] : []).map((entry) => {
    const idx = entry.lastIndexOf(':');
    return [entry.slice(0, idx), entry.slice(idx + 1) as SortDirection] as [string, SortDirection];
  });
  if (sortBy.length) {
    rows.sort((a, b) => {
      for (const [column, direction] of sortBy) {
        const av = getPath(a, column);
        const bv = getPath(b, column);
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        if (cmp !== 0) {
          return direction === 'DESC' ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  const itemsPerPage = params['limit'] ? Number(params['limit']) : DEFAULT_LIMIT;
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPage = Math.min(Math.max(params['page'] ? Number(params['page']) : 1, 1), totalPages);
  const data = rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Links are produced with the client library itself: `.with({ page })` returns a
  // new builder with only the page changed — the same trick works in real UIs.
  const link = (page: number): string => `/api/users${builder.with({ page }).toQueryString()}`;

  return {
    data,
    meta: {
      itemsPerPage,
      totalItems,
      currentPage,
      totalPages,
      sortBy,
      ...(search !== undefined ? { search: params['search'] as string } : {}),
    },
    links: {
      first: currentPage > 1 ? link(1) : undefined,
      previous: currentPage > 1 ? link(currentPage - 1) : undefined,
      current: link(currentPage),
      next: currentPage < totalPages ? link(currentPage + 1) : undefined,
      last: currentPage < totalPages ? link(totalPages) : undefined,
    },
  };
};
