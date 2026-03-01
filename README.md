# nestjs-paginate-client

[![CI](https://github.com/M0D1xD/nestjs-paginate-client/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/M0D1xD/nestjs-paginate-client/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/nestjs-paginate-client.svg)](https://www.npmjs.com/package/nestjs-paginate-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe query string builder for backends that use [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate). Build `page`, `limit`, `sortBy`, `search`, `searchBy`, `select`, and `filter` query params with TypeScript types so column names match your frontend types.

## Installation

```bash
npm install nestjs-paginate-client
```

## Compatibility

Generated query strings match the format expected by nestjs-paginate:

- **Pagination:** `page`, `limit`
- **Sort:** `sortBy=column:ASC` or `sortBy=column:DESC` (multiple allowed)
- **Search:** `search`, `searchBy` (array of column names)
- **Select:** `select=col1,col2,...`
- **Filter:** `filter.<column>=<token>` where token format is `[comparator]:[suffix]:[operator]:value`
- **Cursor:** `cursor`, `withDeleted`

### Filter operators

| Operator              | Token       | Example / value       |
| --------------------- | ----------- | --------------------- |
| Equals                | `$eq`       | `$eq:John`            |
| Not                   | `$not`      | prefix: `$not:$eq:x`  |
| Greater than          | `$gt`       | `$gt:5`               |
| Greater or equal      | `$gte`      | `$gte:3`              |
| Less than             | `$lt`       | `$lt:10`              |
| Less or equal         | `$lte`      | `$lte:7`              |
| In list               | `$in`       | `$in:a,b,c`           |
| Is null               | `$null`     | no value              |
| Between               | `$btw`      | `$btw:1,10`           |
| Case-insensitive like | `$ilike`    | `$ilike:term`         |
| Starts with           | `$sw`       | `$sw:prefix`          |
| Array contains        | `$contains` | `$contains:a,b`       |
| OR                    | `$or`       | prefix: `$or:$eq:foo` |
| AND                   | `$and`      | prefix: `$and:$eq:foo`|

Nested/relation columns use dot notation: `courses.name`, `courses.price`.

## Usage

Define your types and use the builder with typed column paths. The generic ensures only valid keys (and nested paths like `courses.price`) are allowed:

```ts
import { createPaginateParams, eq, gte, in as filterIn } from 'nestjs-paginate-client';

type Course = { id: number; name: string; price: number };
type UserCourse = { id: number; userId: number; courseId: number; registerDate: Date; expiryDate: Date };
type User = { id: number; name: string; email: string; courses: UserCourse[] };

// Paginate User with filters on User fields and nested courses relation
const params = createPaginateParams<User>()
  .page(1)                                         // optional
  .limit(10)                                       // optional
  .sortBy('name', 'ASC')                           // optional (can chain multiple)
  .sortBy('email', 'DESC')
  .search('john')                                  // optional
  .searchBy(['name', 'email'])                     // optional; array of column names
  .filter('name', eq('John'))                      // optional (can chain multiple)
  .filter('courses.price', gte(100))               // optional; nested: User.courses.price
  .filter('courses.courseId', filterIn([1, 2]));   // optional; nested: User.courses.courseId

// Query string for URL
const queryString = params.toQueryString();
// e.g. ?page=1&limit=10&sortBy=name%3AASC&sortBy=email%3ADESC&search=john&...

// Params object for axios/fetch
const obj = params.toParams();
// { page: '1', limit: '10', sortBy: ['name:ASC', 'email:DESC'], 'filter.name': '$eq:John', ... }
```

### Filter helpers

- `eq(value)`, `gt(value)`, `gte(value)`, `lt(value)`, `lte(value)`
- `inOp(values)` / `in(values)` — in list (accepts an array)
- `nullOp()` — is null
- `btw(min, max)` — between
- `ilike(value)`, `sw(value)` — string match
- `contains(...values)` — array contains (variadic)
- `not(token)` — negate (e.g. `not(eq('x'))` → `$not:$eq:x`)
- `or(token)` — OR comparator (e.g. `or(eq('foo'))` → `$or:$eq:foo`)
- `and(token)` — AND comparator (e.g. `and(eq('foo'))` → `$and:$eq:foo`)

For full control use `buildFilterToken({ comparator, suffix, operator, value })` from the package.

## API

- **createPaginateParams&lt;T&gt;(input?)** — returns a `PaginateQueryBuilder<T>`. Accepts an optional `PaginateParamsInput<T>` object to pre-populate the builder (e.g. `createPaginateParams<User>({ page: 2, filter: { name: eq('John') } })`).
- **fromQueryString&lt;T&gt;(qs)** — parse a query string (e.g. from `window.location.search`) back into a `PaginateQueryBuilder<T>` for manipulation or round-tripping.
- **PaginateQueryBuilder&lt;T&gt;** — fluent builder with:
  - `.page(n)`, `.limit(n)`, `.sortBy(column, 'ASC'|'DESC')`, `.search(term)`, `.searchBy(columns)`, `.select(columns)`, `.filter(column, token)`, `.cursor(c)`, `.withDeleted(bool)`
  - `.toParams()` — `Record<string, string | string[]>`
  - `.toQueryString()` — `?key=value&...`
  - `.toURLSearchParams()` — native `URLSearchParams` instance
  - `.clone()` — deep copy of the builder; mutations on the clone do not affect the original
- **ColumnPath&lt;T&gt;** — type of allowed column paths for `T` (including nested, e.g. `offers.price`).
- **toQueryString(params)** — serialize a params object to a query string.
- **PaginatedResponse&lt;T&gt;**, **PaginatedMeta**, **PaginatedLinks** — TypeScript interfaces matching the nestjs-paginate response shape, ready to use as response types in fetch/axios calls.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines and [DEVELOPMENT.md](.github/DEVELOPMENT.md) for local setup and scripts.

Releases to npm are automated via [release-it](https://github.com/release-it/release-it) on the default branch.

## Credits

This library was inspired by [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate/tree/master) by [ppetzold](https://github.com/ppetzold). The query string format (pagination, sort, search, filter, etc.) is designed to work with backends using that package.

## License

MIT
