# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```shell
pnpm install        # install deps
pnpm build          # compile src/ → dist/ via tsdown (dual ESM/CJS + .d.ts)
pnpm build --watch  # watch mode
pnpm test           # run vitest (all spec files)
pnpm test:watch     # vitest interactive watch
pnpm lint           # ESLint (0 warnings allowed); run pnpm build first
pnpm tsc:check      # TypeScript type-check only (no emit)
pnpm format         # prettier on src/
```

To run a single test file:
```shell
pnpm vitest run src/lib/builder.spec.ts
```

## Architecture

Zero-dependency TypeScript library that builds type-safe query strings for [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate) backends. Dual CJS/ESM output via `tsdown` with `unbundle: true` — each `src/lib/*.ts` file maps to its own file in `dist/lib/`.

### Source layout (`src/lib/`)

| File | Role |
|---|---|
| `types.ts` | `PaginateParamsInput<T>`, `ColumnPath<T>` (recursive type for dot-notation column paths), `FilterOperator/Suffix/Comparator` enums, response shape types |
| `filter.ts` | Filter token helpers (`eq`, `gte`, `inOp`, `btw`, `not`, `or`, `and`, …) and low-level `buildFilterToken` |
| `builder.ts` | `PaginateQueryBuilder<T>` (fluent API) and `createPaginateParams<T>()` factory |
| `query-string.ts` | `toQueryString(params)` — serializes `PaginateParamsRaw` to `?key=value&…` |
| `parse.ts` | `fromQueryString(qs)` — parses a URL query string back into a `PaginateQueryBuilder<T>` |

### Key design points

- **`ColumnPath<T>`** is a recursive mapped type (depth-limited via `Prev` tuple) that resolves dot-path strings for all primitive fields and nested relations. It constrains all column name arguments at compile time.
- **`PaginateQueryBuilder<T>`** accumulates state in private fields. `.filter()` merges tokens for the same column into an array (for OR conditions). `.removeFilter()` deletes a column's filter. `.clone()` deep-copies all internal state.
- **`toParams()`** is the single serialization point: it produces `Record<string, string | string[]>` with nestjs-paginate key conventions (`filter.<column>`, `sortBy` as `col:DIR` array, `select` as comma-joined string). `toQueryString()` and `toURLSearchParams()` both delegate to it.
- **Filter token format**: `[comparator:][$not:]$operator:value`. The `$and` comparator is omitted (it is the default). `$null` has no value.
- `console.*` calls in tests cause test failures — do not add them.
