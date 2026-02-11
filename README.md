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

Nested/relation columns use dot notation: `offers.name`, `offers.price`.

## Usage

Define your types and use the builder with typed column paths:

```ts
import { createPaginateParams, eq, gte, in as filterIn } from 'nestjs-paginate-client';

type Offer = { name: string; price: number };
type User = { name: string; email: string; offers: Offer[] };

const params = createPaginateParams<User>()
  .page(1)
  .limit(10)
  .sortBy('name', 'ASC')
  .sortBy('email', 'DESC')
  .search('john')
  .searchBy(['name', 'email'])
  .filter('name', eq('John'))
  .filter('offers.price', gte(100))
  .filter('offers.name', filterIn(['A', 'B']));

// Query string for URL
const queryString = params.toQueryString();
// e.g. ?page=1&limit=10&sortBy=name%3AASC&sortBy=email%3ADESC&search=john&...

// Params object for axios/fetch
const obj = params.toParams();
// { page: '1', limit: '10', sortBy: ['name:ASC', 'email:DESC'], 'filter.name': '$eq:John', ... }
```

### Filter helpers

- `eq(value)`, `gt(value)`, `gte(value)`, `lt(value)`, `lte(value)`
- `inOp(values)` / `in(values)` — in list
- `nullOp()` — is null
- `btw(min, max)` — between
- `ilike(value)`, `sw(value)` — string match
- `contains(values)` — array contains
- `not(token)` — negate (e.g. `not(eq('x'))` → `$not:$eq:x`)
- `or(token)` — OR comparator (e.g. `or(eq('foo'))` → `$or:$eq:foo`)

For full control use `buildFilterToken({ comparator, suffix, operator, value })` from the package.

## API

- **createPaginateParams&lt;T&gt;()** — returns a `PaginateQueryBuilder<T>`.
- **PaginateQueryBuilder&lt;T&gt;** — fluent builder with:
  - `.page(n)`, `.limit(n)`, `.sortBy(column, 'ASC'|'DESC')`, `.search(term)`, `.searchBy(columns)`, `.select(columns)`, `.filter(column, token)`, `.cursor(c)`, `.withDeleted(bool)`
  - `.toParams()` — `Record<string, string | string[]>`
  - `.toQueryString()` — `?key=value&...`
- **ColumnPath&lt;T&gt;** — type of allowed column paths for `T` (including nested, e.g. `offers.price`).
- **toQueryString(params)** — serialize a params object to a query string.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines and [DEVELOPMENT.md](.github/DEVELOPMENT.md) for local setup and scripts.

Releases to npm are automated via [semantic-release](https://github.com/semantic-release/semantic-release) on the default branch. For token setup and release flow, see [docs/RELEASE_AND_TOKENS.md](docs/RELEASE_AND_TOKENS.md).

## Credits

This library was inspired by [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate/tree/master) by [ppetzold](https://github.com/ppetzold). The query string format (pagination, sort, search, filter, etc.) is designed to work with backends using that package.

## License

MIT
