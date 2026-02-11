import type { ColumnPath, PaginateParamsRaw, SortDirection } from './types';
import { toQueryString } from './query-string';

/**
 * Fluent builder for nestjs-paginate query parameters.
 * Use {@link createPaginateParams} to create an instance, then chain methods and call
 * {@link PaginateQueryBuilder.toParams} or {@link PaginateQueryBuilder.toQueryString} to get the result.
 *
 * @typeParam T - The entity type (e.g. `User`). Column names are constrained to {@link ColumnPath}<T>.
 */
export class PaginateQueryBuilder<T> {
  private _page?: number;
  private _limit?: number;
  private _sortBy: [string, SortDirection][] = [];
  private _search?: string;
  private _searchBy: string[] = [];
  private _select: string[] = [];
  private _filter: Record<string, string | string[]> = {};
  private _cursor?: string;
  private _withDeleted?: boolean;

  /**
   * Set the page number to retrieve.
   * If invalid, the backend will apply its default (usually 1).
   *
   * @param n - Page number (1-based).
   * @returns This builder for chaining.
   */
  page(n: number): this {
    this._page = n;
    return this;
  }

  /**
   * Set the number of records per page.
   * Backend may cap this to its configured max limit.
   *
   * @param n - Items per page.
   * @returns This builder for chaining.
   */
  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /**
   * Add a sort rule. Call multiple times to sort by several columns; order of calls defines sort priority.
   *
   * @param column - Column path to sort by (must be in {@link ColumnPath}<T>).
   * @param direction - `'ASC'` or `'DESC'`.
   * @returns This builder for chaining.
   */
  sortBy(column: ColumnPath<T>, direction: SortDirection): this {
    this._sortBy.push([column, direction]);
    return this;
  }

  /**
   * Set the search term to filter results across searchable columns.
   *
   * @param term - Search string (e.g. user-typed query).
   * @returns This builder for chaining.
   */
  search(term: string): this {
    this._search = term;
    return this;
  }

  /**
   * Set which columns to search when using {@link PaginateQueryBuilder.search}.
   * When not set, the backend uses all configured searchable columns.
   *
   * @param columns - Column paths to search in.
   * @returns This builder for chaining.
   */
  searchBy(columns: ColumnPath<T>[]): this {
    this._searchBy = columns.slice();
    return this;
  }

  /**
   * Set the list of fields to select (sparse fieldsets). When not set, the backend returns all fields.
   *
   * @param columns - Column paths to include in the response.
   * @returns This builder for chaining.
   */
  select(columns: ColumnPath<T>[]): this {
    this._select = columns.slice();
    return this;
  }

  /**
   * Add a filter on a column. Use filter helpers (e.g. {@link eq}, {@link gte}, {@link inOp}) to build token strings.
   * Call multiple times for the same column to add multiple conditions (e.g. OR filters).
   *
   * @param column - Column path to filter on (must be in {@link ColumnPath}<T>).
   * @param token - Filter token string or array of tokens (e.g. `eq('John')`, `[or(eq('A')), or(eq('B'))]`).
   * @returns This builder for chaining.
   */
  filter(column: ColumnPath<T>, token: string | string[]): this {
    const key = column as string;
    const existing = this._filter[key];
    const next = Array.isArray(token) ? token : [token];
    this._filter[key] = existing
      ? [...(Array.isArray(existing) ? existing : [existing]), ...next]
      : next.length === 1
        ? next[0]
        : next;
    return this;
  }

  /**
   * Set the cursor for cursor-based pagination (next/previous page).
   * Use the value from the previous response (e.g. `meta.cursor` or `links.next` query string).
   *
   * @param c - Opaque cursor string from the backend.
   * @returns This builder for chaining.
   */
  cursor(c: string): this {
    this._cursor = c;
    return this;
  }

  /**
   * Include soft-deleted records when the backend supports it.
   *
   * @param value - `true` to include deleted records.
   * @returns This builder for chaining.
   */
  withDeleted(value: boolean): this {
    this._withDeleted = value;
    return this;
  }

  /**
   * Build a params object suitable for `URLSearchParams`, axios `params`, or fetch query string.
   * Keys match nestjs-paginate: `page`, `limit`, `sortBy` (array), `search`, `searchBy`, `select`, `filter.<column>`, `cursor`, `withDeleted`.
   *
   * @returns Record of query parameter names to string or string[] values.
   */
  toParams(): PaginateParamsRaw {
    const raw: PaginateParamsRaw = {};
    if (this._page !== undefined) raw.page = String(this._page);
    if (this._limit !== undefined) raw.limit = String(this._limit);
    if (this._sortBy.length) raw.sortBy = this._sortBy.map(([col, dir]) => `${col}:${dir}`);
    if (this._search !== undefined && this._search !== '') raw.search = this._search;
    if (this._searchBy.length) raw.searchBy = this._searchBy;
    if (this._select.length) raw.select = this._select.join(',');
    if (this._cursor !== undefined) raw.cursor = this._cursor;
    if (this._withDeleted !== undefined) raw.withDeleted = String(this._withDeleted);
    for (const [column, value] of Object.entries(this._filter)) raw[`filter.${column}`] = value;
    return raw;
  }

  /**
   * Build a query string (e.g. `?page=1&limit=10&sortBy=name:ASC`) compatible with nestjs-paginate.
   * Values are encoded with `encodeURIComponent`; repeated keys (sortBy, searchBy) are emitted as multiple key=value pairs.
   *
   * @returns Query string including leading `?`, or empty string if no params.
   */
  toQueryString(): string {
    return toQueryString(this.toParams());
  }
}

/**
 * Create a new paginate query builder for entity type `T`.
 * Column names in `sortBy`, `searchBy`, `select`, and `filter` will be type-checked against {@link ColumnPath}<T>.
 *
 * @typeParam T - The entity type (e.g. `User`, `Offer`).
 * @returns A new {@link PaginateQueryBuilder} instance.
 *
 * @example
 * ```ts
 * type User = { name: string; email: string };
 * const params = createPaginateParams<User>()
 *   .page(1)
 *   .limit(10)
 *   .sortBy('name', 'ASC')
 *   .filter('email', eq('a@b.com'))
 *   .toQueryString();
 * ```
 */
export function createPaginateParams<T>(): PaginateQueryBuilder<T> {
  return new PaginateQueryBuilder<T>();
}
