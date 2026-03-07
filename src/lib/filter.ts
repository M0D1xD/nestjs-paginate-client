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
  value?: string | number | [number, number] | [string, string];
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
export const buildFilterToken = (options: FilterTokenOptions): string => {
  const { comparator, suffix, operator, value } = options;
  const parts: string[] = [];

  if (comparator && comparator !== FilterComparator.AND) {
    parts.push(comparator);
  }

  if (suffix) {
    parts.push(suffix);
  }

  parts.push(operator);

  if (operator === FilterOperator.NULL) {
    return parts.join(SEP);
  }

  let valueStr: string;

  if (Array.isArray(value)) {
    valueStr = value.map(String).join(',');
  } else if (value !== undefined && value !== null) {
    valueStr = String(value);
  } else {
    throw new Error(`Filter operator "${operator}" requires a value, but none was provided.`);
  }

  parts.push(valueStr);

  return parts.join(SEP);
};
/**
 * Equals. Produces a token like `$eq:value`.
 */
export const eq = (value: string | number | boolean): string => {
  return buildFilterToken({ operator: FilterOperator.EQ, value: String(value) });
};

/**
 * Greater than. Produces a token like `$gt:value`.
 */
export const gt = (value: number): string => {
  return buildFilterToken({ operator: FilterOperator.GT, value });
};

/**
 * Greater than or equal. Produces a token like `$gte:value`.
 */
export const gte = (value: number): string => {
  return buildFilterToken({ operator: FilterOperator.GTE, value });
};

/**
 * Less than. Produces a token like `$lt:value`.
 */
export const lt = (value: number): string => {
  return buildFilterToken({ operator: FilterOperator.LT, value });
};

/**
 * Less than or equal. Produces a token like `$lte:value`.
 */
export const lte = (value: number): string => {
  return buildFilterToken({ operator: FilterOperator.LTE, value });
};

/**
 * In list. Produces a token like `$in:a,b,c`.
 */
export const inOp = (values: (string | number)[]): string => {
  return buildFilterToken({
    operator: FilterOperator.IN,
    value: values.map(String).join(','),
  });
};

/**
 * Is null. Produces the token `$null`.
 */
export const nullOp = (): string => {
  return buildFilterToken({ operator: FilterOperator.NULL });
};

/**
 * Between (inclusive). Produces `$btw:min,max`.
 * Accepts either two numbers or two strings (e.g. date strings).
 */
export const btw = (min: number | string, max: number | string): string => {
  return buildFilterToken({
    operator: FilterOperator.BTW,
    value: [min, max] as [number, number] | [string, string],
  });
};

/**
 * Case-insensitive like. Produces `$ilike:value`.
 */
export const ilike = (value: string): string => {
  return buildFilterToken({ operator: FilterOperator.ILIKE, value });
};

/**
 * Starts with. Produces `$sw:value`.
 */
export const sw = (value: string): string => {
  return buildFilterToken({ operator: FilterOperator.SW, value });
};

/**
 * Array contains. Produces `$contains:a,b`.
 */
export const contains = (...values: (string | number)[]): string => {
  return buildFilterToken({
    operator: FilterOperator.CONTAINS,
    value: values.map(String).join(','),
  });
};

/**
 * Negate a filter token.
 */
export const not = (token: string): string => {
  return `${FilterSuffix.NOT}${SEP}${token}`;
};

/**
 * OR comparator.
 */
export const or = (token: string): string => {
  return `${FilterComparator.OR}${SEP}${token}`;
};

/**
 * AND comparator.
 */
export const and = (token: string): string => {
  return `${FilterComparator.AND}${SEP}${token}`;
};

/** Alias for `inOp` */
export { inOp as in };
