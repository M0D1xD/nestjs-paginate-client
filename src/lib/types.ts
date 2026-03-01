/**
 * Filter operators compatible with nestjs-paginate backend.
 */
export enum FilterOperator {
  EQ = '$eq',
  GT = '$gt',
  GTE = '$gte',
  IN = '$in',
  NULL = '$null',
  LT = '$lt',
  LTE = '$lte',
  BTW = '$btw',
  ILIKE = '$ilike',
  SW = '$sw',
  CONTAINS = '$contains',
}

export enum FilterSuffix {
  NOT = '$not',
}

export enum FilterComparator {
  AND = '$and',
  OR = '$or',
}

export type SortDirection = 'ASC' | 'DESC';

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

/**
 * Column path for type T up to depth D.
 * Primitives -> key; Arrays -> key + key.nestedPath; Objects -> key + key.nestedPath.
 */
export type Column<T, D extends number = 2> = [D] extends [never]
  ? never
  : T extends Record<string, unknown>
    ? {
        [K in keyof T]-?: K extends string
          ? T[K] extends string | number | boolean | Date
            ? `${K}`
            : T[K] extends (infer U)[]
              ? `${K}` | Join<K, Column<U, Prev[D]>>
              : T[K] extends Record<string, unknown>
                ? `${K}` | Join<K, Column<T[K], Prev[D]>>
                : `${K}`
          : never;
      }[keyof T]
    : '';

export type ColumnPath<T> = Column<T> extends infer C ? (C extends string ? C : never) : never;

/**
 * Params shape for serialization (query string / axios params).
 * Keys: page, limit, sortBy[], search, searchBy[], select, filter.<column>, cursor, withDeleted.
 */
export type PaginateParamsRaw = Record<string, string | string[]>;

/** Metadata returned in a nestjs-paginate response. */
export interface PaginatedMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  sortBy: [string, SortDirection][];
  search?: string;
  searchBy?: string[];
  filter?: Record<string, string | string[]>;
  select?: string[];
  cursor?: string;
}

/** Pagination links returned in a nestjs-paginate response. */
export interface PaginatedLinks {
  first?: string;
  previous?: string;
  current: string;
  next?: string;
  last?: string;
}

/** Full nestjs-paginate response shape. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
  links: PaginatedLinks;
}

/**
 * Input shape for building paginate params, aligned with nestjs-paginate query contract.
 */
export interface PaginateParamsInput<T> {
  /**
   * Page number to retrieve.
   * If you provide an invalid value, the default page number will be applied.
   * @example 1
   * @default 1 (when omitted, backend default applies)
   */
  page?: number;

  /**
   * Number of records per page.
   * If the provided value is greater than the backend’s max limit, the max value will be applied.
   * @example 20
   * @default Backend config (e.g. 20)
   */
  limit?: number;

  /**
   * Sort by one or more columns and direction.
   * To sort by multiple fields, provide multiple entries; the order in the array defines the sort order.
   * Format: `[fieldName, 'ASC' | 'DESC']`.
   * @example [['name', 'ASC'], ['createdAt', 'DESC']]
   * @default Backend default sort (or unspecified order if none configured)
   */
  sortBy?: [ColumnPath<T>, SortDirection][] | [ColumnPath<T>, SortDirection];

  /**
   * Search term to filter result values across searchable columns.
   * @example 'John'
   */
  search?: string;

  /**
   * List of fields to search by the search term.
   * When omitted, the backend uses all configured searchable columns.
   * @example ['name', 'email']
   * @default All searchable fields (backend config)
   */
  searchBy?: ColumnPath<T>[];

  /**
   * List of fields to select (sparse fieldsets).
   * When omitted, all fields are returned.
   * @example ['id', 'name', 'email']
   * @default All fields
   */
  select?: ColumnPath<T>[];

  /**
   * Filter by column. Each key is a column path; each value is a filter token string or array of tokens.
   * Token format: optional `$not`, then operator (e.g. `$eq`, `$gte`, `$in`), then value. Use helpers from this package (e.g. `eq()`, `gte()`) to build tokens.
   * Available operators: `$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$null`, `$btw`, `$ilike`, `$sw`, `$contains`. Comparators: `$and`, `$or`.
   * @example { name: eq('John'), age: gte(18) }
   */
  filter?: Partial<Record<ColumnPath<T>, string | string[]>>;

  /**
   * Cursor for cursor-based pagination.
   * Opaque value returned by the backend in the previous page’s meta (e.g. `meta.cursor`); send it to get the next page.
   */
  cursor?: string;

  /**
   * When true, retrieve records including soft-deleted ones (if the backend supports soft delete).
   */
  withDeleted?: boolean;
}
