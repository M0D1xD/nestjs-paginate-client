import { parseFilterExpression, stringifyFilterExpression } from './expression';
import { toQueryString } from './query-string';
import type {
  ColumnPath,
  FilterExpression,
  PaginateParamsInput,
  PaginateParamsRaw,
  SortDirection,
} from './types';

/**
 * Fluent builder for nestjs-paginate query parameters.
 * Use {@link createPaginateParams} to create an instance, then chain methods and call
 * {@link PaginateQueryBuilder.toParams} or {@link PaginateQueryBuilder.toQueryString} to get the result.
 *
 * @typeParam T - The entity type (e.g. `User`). Column names are constrained to {@link ColumnPath}<T>.
 */
export class PaginateQueryBuilder<T extends object = Record<string, unknown>> {
  private _page?: number;
  private _limit?: number;
  private _sortBy: [string, SortDirection][] = [];
  private _search?: string;
  private _searchBy: string[] = [];
  private _select: string[] = [];
  private _filter: Record<string, string | string[]> = {};
  private _filterExpression?: string;
  private _cursor?: string;
  private _withDeleted?: boolean;

  /**
   * Set the page number to retrieve (1-based).
   */
  page(n: number): this {
    this._page = n;
    return this;
  }

  /**
   * Set the number of records per page.
   */
  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /**
   * Add a sort rule. Call multiple times to sort by several columns; order of calls defines sort priority.
   */
  sortBy(column: ColumnPath<T>, direction: SortDirection): this {
    this._sortBy.push([column, direction]);
    return this;
  }

  /**
   * Add a polymorphic sort (`colA~colB:DIRECTION`) for inheritance / joined polymorphic columns.
   */
  sortByPolymorphic(columns: ColumnPath<T>[], direction: SortDirection): this {
    if (columns.length === 0) {
      throw new Error('sortByPolymorphic() requires at least one column');
    }
    this._sortBy.push([columns.join('~'), direction]);
    return this;
  }

  /**
   * Set the search term to filter results across searchable columns.
   */
  search(term: string): this {
    this._search = term;
    return this;
  }

  /**
   * Set which columns to search when using {@link PaginateQueryBuilder.search}.
   */
  searchBy(columns: ColumnPath<T>[]): this {
    this._searchBy = columns.slice();
    return this;
  }

  /**
   * Set the list of fields to select (sparse fieldsets).
   */
  select(columns: ColumnPath<T>[]): this {
    this._select = columns.slice();
    return this;
  }

  /**
   * Add a per-column filter (`filter.<column>`). Use token helpers (`eq`, `gte`, `any`, …).
   * Multiple tokens for the same column are AND-ed by the backend.
   * For cross-column AND/OR/NOT, use {@link filterExpression}.
   */
  filter(column: ColumnPath<T>, token: string | string[]): this {
    this._filter[column as string] = token;
    return this;
  }

  /**
   * Set the boolean `filter=` expression (AST or raw string).
   */
  filterExpression(expr: FilterExpression | string): this {
    this._filterExpression = typeof expr === 'string' ? expr : stringifyFilterExpression(expr);
    return this;
  }

  /**
   * Alias for {@link filterExpression}.
   */
  expr(expression: FilterExpression | string): this {
    return this.filterExpression(expression);
  }

  /**
   * Clear the `filter=` expression.
   */
  removeFilterExpression(): this {
    this._filterExpression = undefined;
    return this;
  }

  /**
   * Remove a previously added per-column filter.
   */
  removeFilter(column: ColumnPath<T>): this {
    delete this._filter[column as string];
    return this;
  }

  /**
   * Set the cursor for cursor-based pagination.
   */
  cursor(c: string): this {
    this._cursor = c;
    return this;
  }

  /**
   * Include soft-deleted records when the backend supports it.
   */
  withDeleted(value: boolean): this {
    this._withDeleted = value;
    return this;
  }

  /**
   * Create a deep copy of this builder.
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
    copy._filterExpression = this._filterExpression;
    copy._cursor = this._cursor;
    copy._withDeleted = this._withDeleted;
    return copy;
  }

  /**
   * Return a new builder with `partial` merged on top (immutable update for UI stores).
   */
  with(partial: PaginateParamsInput<T>): PaginateQueryBuilder<T> {
    return this.clone().merge(partial);
  }

  /**
   * Mutate this builder by applying fields from `partial`.
   * List fields (`sortBy`) are replaced when provided; filters are overlaid by column.
   */
  merge(partial: PaginateParamsInput<T>): this {
    if (partial.sortBy !== undefined) {
      this._sortBy = [];
    }
    applyInput(this, partial);
    return this;
  }

  /**
   * Build a params object suitable for `URLSearchParams`, axios `params`, or fetch query string.
   */
  toParams(): PaginateParamsRaw {
    const raw: PaginateParamsRaw = {};

    if (this._page !== undefined) {
      raw.page = String(this._page);
    }
    if (this._limit !== undefined) {
      raw.limit = String(this._limit);
    }

    if (this._sortBy.length) {
      raw.sortBy = this._sortBy.map(([col, dir]) => `${col}:${dir}`);
    }

    if (this._search !== undefined && this._search !== '') {
      raw.search = this._search;
    }
    if (this._searchBy.length) {
      raw.searchBy = this._searchBy;
    }
    if (this._select.length) {
      raw.select = this._select.join(',');
    }
    if (this._cursor !== undefined) {
      raw.cursor = this._cursor;
    }
    if (this._withDeleted === true) {
      raw.withDeleted = 'true';
    }

    if (this._filterExpression !== undefined && this._filterExpression !== '') {
      raw.filter = this._filterExpression;
    }

    Object.keys(this._filter).forEach((column) => {
      raw[`filter.${column}`] = this._filter[column];
    });

    return raw;
  }

  /**
   * Build a `URLSearchParams` instance from the current params.
   */
  toURLSearchParams(): URLSearchParams {
    const usp = new URLSearchParams();
    const params = this.toParams();

    Object.keys(params).forEach((key) => {
      const val = params[key];

      if (Array.isArray(val)) {
        val.forEach((v) => {
          usp.append(key, v);
        });
      } else {
        usp.append(key, val);
      }
    });

    return usp;
  }

  /**
   * Build a query string compatible with nestjs-paginate.
   */
  toQueryString(): string {
    return toQueryString(this.toParams());
  }

  /**
   * Parsed `filter=` expression AST, if set.
   */
  getFilterExpression(): FilterExpression | undefined {
    if (this._filterExpression === undefined || this._filterExpression === '') {
      return undefined;
    }
    return parseFilterExpression(this._filterExpression);
  }
}

const isSortByArray = <T extends Record<string, unknown>>(
  s: [ColumnPath<T>, SortDirection][] | [ColumnPath<T>, SortDirection],
): s is [ColumnPath<T>, SortDirection][] => Array.isArray(s[0]);

const applyInput = <T extends Record<string, unknown>>(
  builder: PaginateQueryBuilder<T>,
  input: PaginateParamsInput<T>,
): void => {
  if (input.page !== undefined) {
    builder.page(input.page);
  }
  if (input.limit !== undefined) {
    builder.limit(input.limit);
  }

  if (input.sortBy !== undefined) {
    if (input.sortBy.length > 0) {
      if (isSortByArray<T>(input.sortBy)) {
        input.sortBy.forEach(([col, dir]) => {
          builder.sortBy(col, dir);
        });
      } else {
        const [col, dir] = input.sortBy;
        builder.sortBy(col, dir);
      }
    }
  }

  if (input.search !== undefined) {
    builder.search(input.search);
  }
  if (input.searchBy !== undefined) {
    builder.searchBy(input.searchBy);
  }
  if (input.select !== undefined) {
    builder.select(input.select);
  }
  if (input.cursor !== undefined) {
    builder.cursor(input.cursor);
  }
  if (input.withDeleted !== undefined) {
    builder.withDeleted(input.withDeleted);
  }

  if (input.filter !== undefined) {
    Object.entries(input.filter).forEach(([col, token]) => {
      if (token !== undefined) {
        builder.filter(col as ColumnPath<T>, token as string | string[]);
      }
    });
  }

  if (input.filterExpression !== undefined) {
    builder.filterExpression(input.filterExpression);
  }
};

/**
 * Create a new paginate query builder for entity type `T`, optionally pre-populated from a plain input object.
 */
export const createPaginateParams = <T extends Record<string, unknown>>(
  input?: PaginateParamsInput<T>,
): PaginateQueryBuilder<T> => {
  const builder = new PaginateQueryBuilder<T>();

  if (!input) {
    return builder;
  }

  applyInput(builder, input);
  return builder;
};
