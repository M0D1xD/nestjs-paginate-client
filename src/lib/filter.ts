import { FilterComparator, FilterOperator, FilterSuffix } from './types';

/**
 * Options for building a single filter token string.
 * Used by `buildFilterToken` to produce nestjs-paginate–compatible filter values.
 */
export interface FilterTokenOptions {
  /** Logical grouping: `$and` (default) or `$or`. Omitted when `$and`. */
  comparator?: FilterComparator;
  /** Negate the condition, e.g. `$not`. */
  suffix?: FilterSuffix;
  /** The filter operator (e.g. `$eq`, `$gte`, `$in`). */
  operator: FilterOperator;
  /** Value for the operator. Omit for `$null`; use `[min, max]` for `$btw`; comma-separated string or array for `$in`/`$contains`. */
  value?: string | number | [number, number];
}

const SEP = ':';

/**
 * Builds a single filter token string compatible with nestjs-paginate.
 *
 * Token format: `[comparator]:[suffix]:[operator]:value`
 * - `$null` has no value.
 * - `$in` and `$contains` use a comma-separated value.
 * - `$btw` uses a two-element array `[min, max]`.
 *
 * @param options - Token options (comparator, suffix, operator, value).
 * @returns The filter token string (e.g. `$eq:5`, `$gte:3`, `$or:$eq:foo`).
 */
export function buildFilterToken(options: FilterTokenOptions): string {
  const { comparator, suffix, operator, value } = options;
  const parts: string[] = [];

  if (comparator && comparator !== FilterComparator.AND) parts.push(comparator);
  if (suffix) parts.push(suffix);
  parts.push(operator);

  if (operator === FilterOperator.NULL) return parts.join(SEP);

  let valueStr: string;
  if (Array.isArray(value)) valueStr = value.map(String).join(',');
  else if (value !== undefined && value !== null) valueStr = String(value);
  else return parts.join(SEP);

  parts.push(valueStr);
  return parts.join(SEP);
}

/**
 * Equals. Produces a token like `$eq:value`.
 *
 * @param value - The value to match (string or number).
 * @returns Filter token string.
 */
export function eq(value: string | number): string {
  return buildFilterToken({ operator: FilterOperator.EQ, value });
}

/**
 * Greater than. Produces a token like `$gt:value`.
 *
 * @param value - The numeric lower bound (exclusive).
 * @returns Filter token string.
 */
export function gt(value: number): string {
  return buildFilterToken({ operator: FilterOperator.GT, value });
}

/**
 * Greater than or equal. Produces a token like `$gte:value`.
 *
 * @param value - The numeric lower bound (inclusive).
 * @returns Filter token string.
 */
export function gte(value: number): string {
  return buildFilterToken({ operator: FilterOperator.GTE, value });
}

/**
 * Less than. Produces a token like `$lt:value`.
 *
 * @param value - The numeric upper bound (exclusive).
 * @returns Filter token string.
 */
export function lt(value: number): string {
  return buildFilterToken({ operator: FilterOperator.LT, value });
}

/**
 * Less than or equal. Produces a token like `$lte:value`.
 *
 * @param value - The numeric upper bound (inclusive).
 * @returns Filter token string.
 */
export function lte(value: number): string {
  return buildFilterToken({ operator: FilterOperator.LTE, value });
}

/**
 * In list. Produces a token like `$in:a,b,c` for “column value is one of these”.
 *
 * @param values - Array of allowed values (strings or numbers).
 * @returns Filter token string.
 */
export function inOp(values: (string | number)[]): string {
  return buildFilterToken({
    operator: FilterOperator.IN,
    value: values.map(String).join(','),
  });
}

/**
 * Is null. Produces the token `$null` (no value).
 *
 * @returns Filter token string.
 */
export function nullOp(): string {
  return buildFilterToken({ operator: FilterOperator.NULL });
}

/**
 * Between (inclusive). Produces a token like `$btw:min,max`.
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns Filter token string.
 */
export function btw(min: number, max: number): string {
  return buildFilterToken({ operator: FilterOperator.BTW, value: [min, max] });
}

/**
 * Case-insensitive like. Produces a token like `$ilike:value` (backend typically wraps in `%` for substring match).
 *
 * @param value - The string to match.
 * @returns Filter token string.
 */
export function ilike(value: string): string {
  return buildFilterToken({ operator: FilterOperator.ILIKE, value });
}

/**
 * Starts with. Produces a token like `$sw:value` (backend typically appends `%`).
 *
 * @param value - The prefix string.
 * @returns Filter token string.
 */
export function sw(value: string): string {
  return buildFilterToken({ operator: FilterOperator.SW, value });
}

/**
 * Array contains. Produces a token like `$contains:a,b` for array columns.
 *
 * @param values - Values that must be contained in the array.
 * @returns Filter token string.
 */
export function contains(values: (string | number)[]): string {
  return buildFilterToken({
    operator: FilterOperator.CONTAINS,
    value: values.map(String).join(','),
  });
}

/**
 * Negate a filter token. Prepends `$not:` to the given token (e.g. `not(eq('x'))` → `$not:$eq:x`).
 *
 * @param token - A filter token string from another helper (e.g. `eq('x')`, `nullOp()`).
 * @returns Filter token string.
 */
export function not(token: string): string {
  return `${FilterSuffix.NOT}${SEP}${token}`;
}

/**
 * OR comparator. Prepends `$or:` to the given token so the condition is combined with OR (e.g. `or(eq('foo'))` → `$or:$eq:foo`).
 *
 * @param token - A filter token string.
 * @returns Filter token string.
 */
export function or(token: string): string {
  return `${FilterComparator.OR}${SEP}${token}`;
}

/** Alias for `inOp` (use when `in` is not a reserved word in your context). */
export { inOp as in };
