import type { ColumnPath, PaginateParamsInput, PaginateParamsRaw, SortDirection } from './types';
import { toQueryString } from './query-string';

/**
 * Fluent builder for nestjs-paginate query parameters.
 * Use {@link createPaginateParams} to create an instance, then chain methods and call
 * {@link PaginateQueryBuilder.toParams} or {@link PaginateQueryBuilder.toQueryString} to get the result.
 *
 * @typeParam T - The entity type (e.g. `User`). Column names are constrained to {@link ColumnPath}<T>.
 */
export class PaginateQueryBuilder<T extends Record<string, unknown>> {
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
   * Create a deep copy of this builder. Mutations on the clone do not affect the original.
   *
   * @returns A new {@link PaginateQueryBuilder} with the same state.
   */
  clone(): PaginateQueryBuilder<T> {
    const copy = new PaginateQueryBuilder<T>();
    copy._page = this._page;
    copy._limit = this._limit;
    copy._sortBy = this._sortBy.map(([col, dir]) => [col, dir] as [string, SortDirection]);
    copy._search = this._search;
    copy._searchBy = [...this._searchBy];
    copy._select = [...this._select];
    copy._filter = Object.fromEntries(
      Object.entries(this._filter).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]),
    );
    copy._cursor = this._cursor;
    copy._withDeleted = this._withDeleted;
    return copy;
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
    if (this._withDeleted === true) raw.withDeleted = 'true';
    for (const [column, value] of Object.entries(this._filter)) raw[`filter.${column}`] = value;
    return raw;
  }

  /**
   * Build a `URLSearchParams` instance from the current params.
   * Repeated keys (e.g. `sortBy`, `searchBy`) are appended individually.
   *
   * @returns A `URLSearchParams` object ready for use with `fetch` or `URL`.
   */
  toURLSearchParams(): URLSearchParams {
    const usp = new URLSearchParams();
    for (const [key, val] of Object.entries(this.toParams())) {
      if (Array.isArray(val)) {
        for (const v of val) usp.append(key, v);
      } else {
        usp.append(key, val);
      }
    }
    return usp;
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
 * Create a new paginate query builder for entity type `T`, optionally pre-populated from a plain input object.
 * Column names in `sortBy`, `searchBy`, `select`, and `filter` will be type-checked against {@link ColumnPath}<T>.
 *
 * @typeParam T - The entity type (e.g. `User`, `Offer`).
 * @param input - Optional initial params. Each field maps to the corresponding builder method.
 * @returns A new {@link PaginateQueryBuilder} instance.
 *
 * @example
 * ```ts
 * type User = { name: string; email: string };
 * const params = createPaginateParams<User>({ page: 1, filter: { name: eq('John') } })
 *   .limit(10)
 *   .toQueryString();
 * ```
 */
export function createPaginateParams<T extends Record<string, unknown>>(
  input?: PaginateParamsInput<T>,
): PaginateQueryBuilder<T> {
  const builder = new PaginateQueryBuilder<T>();
  if (!input) return builder;
  if (input.page !== undefined) builder.page(input.page);
  if (input.limit !== undefined) builder.limit(input.limit);
  if (input.sortBy !== undefined && input.sortBy.length > 0) {
    if (Array.isArray(input.sortBy[0])) {
      for (const entry of input.sortBy as unknown as [ColumnPath<T>, SortDirection][]) {
        builder.sortBy(entry[0], entry[1]);
      }
    } else {
      const [col, dir] = input.sortBy as unknown as [ColumnPath<T>, SortDirection];
      builder.sortBy(col, dir);
    }
  }
  if (input.search !== undefined) builder.search(input.search);
  if (input.searchBy !== undefined) builder.searchBy(input.searchBy);
  if (input.select !== undefined) builder.select(input.select);
  if (input.cursor !== undefined) builder.cursor(input.cursor);
  if (input.withDeleted !== undefined) builder.withDeleted(input.withDeleted);
  if (input.filter !== undefined) {
    for (const [col, token] of Object.entries(input.filter) as [ColumnPath<T>, string | string[]][]) {
      builder.filter(col, token);
    }
  }
  return builder;
}
