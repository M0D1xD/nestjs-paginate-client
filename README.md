# nestjs-paginate-client

[![CI](https://github.com/M0D1xD/nestjs-paginate-client/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/M0D1xD/nestjs-paginate-client/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/nestjs-paginate-client.svg)](https://www.npmjs.com/package/nestjs-paginate-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**nestjs-paginate-client** is a lightweight, zero-dependency TypeScript library for building type-safe query strings that work seamlessly with [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate) backends.

Instead of constructing pagination query params by hand and hoping the column names are right, you define your entity types once and let the builder enforce valid column paths at compile time — including nested relations like `courses.price`. It covers everything nestjs-paginate understands: `page`, `limit`, `sortBy` (including polymorphic sort), `search`, `searchBy`, `select`, per-column `filter.<column>` tokens with to-many quantifiers, cross-column boolean `filter=` expressions, `cursor`, and `withDeleted`.

The fluent API works the same way in any frontend stack — React, Vue, Angular, or plain TypeScript — and outputs either a query string (`?page=1&limit=10&...`) or a plain params object ready for axios or `fetch`. It also round-trips: `fromQueryString()` and `fromUrl()` parse a URL back into a builder, `parsePaginatedLinks()` turns a response's `links` into ready-to-use builders for prev/next navigation, and `PaginatedResponse<T>` types match the nestjs-paginate response shape (including cursor mode). Helpers like `clone()`, `with()`, and `toURLSearchParams()` cover advanced use cases.

## Installation

```bash
npm install nestjs-paginate-client
```

## Compatibility

Generated query strings match the format expected by nestjs-paginate:

- **Pagination:** `page`, `limit`
- **Sort:** `sortBy=column:ASC` or `sortBy=column:DESC` (multiple allowed); polymorphic sort as `sortBy=colA~colB:DIR`
- **Search:** `search`, `searchBy` (array of column names)
- **Select:** `select=col1,col2,...`
- **Per-column filter:** `filter.<column>=<token>` where token format is `[quantifier:][$not:]$operator:value`
- **Boolean filter expression:** `filter=<expression>` combining columns with `AND` / `OR` / `NOT` and parentheses, e.g. `filter=(age=$gte:18 OR vip=$eq:true) AND NOT status=$eq:banned`
- **Cursor:** `cursor`, `withDeleted`

### Filter operators

| Operator              | Token       | Example / value      |
| --------------------- | ----------- | -------------------- |
| Equals                | `$eq`       | `$eq:John`           |
| Not                   | `$not`      | prefix: `$not:$eq:x` |
| Greater than          | `$gt`       | `$gt:5`              |
| Greater or equal      | `$gte`      | `$gte:3`             |
| Less than             | `$lt`       | `$lt:10`             |
| Less or equal         | `$lte`      | `$lte:7`             |
| In list               | `$in`       | `$in:a,b,c`          |
| Is null               | `$null`     | no value             |
| Between               | `$btw`      | `$btw:1,10`          |
| Case-insensitive like | `$ilike`    | `$ilike:term`        |
| Starts with           | `$sw`       | `$sw:prefix`         |
| Array contains        | `$contains` | `$contains:a,b`      |

### To-many quantifiers

For filters on to-many relations, a quantifier prefix controls how related rows must match:

| Quantifier | Token   | Meaning                                            |
| ---------- | ------- | -------------------------------------------------- |
| Any        | `$any`  | at least one related row matches (default, omitted) |
| All        | `$all`  | every related row matches                           |
| None       | `$none` | no related row matches                              |

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
- `btw(min, max)` — between (numbers or strings, e.g. date strings)
- `ilike(value)`, `sw(value)` — string match
- `contains(...values)` — array contains (variadic)
- `not(token)` — negate (e.g. `not(eq('x'))` → `$not:$eq:x`)
- `any(token)`, `all(token)`, `none(token)` — to-many quantifiers (e.g. `all(gte(4))` → `$all:$gte:4`; `$any` is the backend default and usually omitted)

Pass an array to `.filter()` to send multiple tokens for the same column (the backend ANDs them): `.filter('age', [gte(18), lte(30)])`. Use `.removeFilter(column)` to drop a column's filter.

For full control use `buildFilterToken({ quantifier, suffix, operator, value })` from the package.

### Filter expressions (cross-column AND / OR / NOT)

Per-column `filter.<column>` tokens can only combine conditions on the same column. For boolean logic **across** columns, build a `filter=` expression from an AST:

```ts
import { createPaginateParams, and, or, notExpr, leaf, eq, gte } from 'nestjs-paginate-client';

const params = createPaginateParams<User>().filterExpression(
  and(
    or(leaf('name', eq('John')), leaf('name', eq('Jane'))),
    notExpr(leaf('status', eq('banned'))),
  ),
);

params.toQueryString();
// ?filter=(name%3D%24eq%3AJohn%20OR%20name%3D%24eq%3AJane)%20AND%20NOT%20status%3D%24eq%3Abanned
// decoded: filter=(name=$eq:John OR name=$eq:Jane) AND NOT status=$eq:banned
```

- `leaf(column, token)` — a single `column=token` term; combine with `and(...)`, `or(...)`, `notExpr(...)` (precedence: NOT > AND > OR, parentheses added automatically).
- `.filterExpression(exprOrString)` (alias `.expr()`) also accepts a raw expression string; `.removeFilterExpression()` clears it; `.getFilterExpression()` returns the parsed AST.
- `parseFilterExpression(str)` / `stringifyFilterExpression(ast)` convert between the string and AST forms. Parsing is complexity-limited (`DEFAULT_FILTER_EXPRESSION_MAX_COMPLEXITY`, 100 nodes) to guard against hostile input.

### Pagination links

Turn the `links` object from a nestjs-paginate response into builders for navigation:

```ts
import { parsePaginatedLinks, nextPageQueryString, fromUrl } from 'nestjs-paginate-client';

const res: PaginatedResponse<User> = await fetch(url).then(r => r.json());

const links = parsePaginatedLinks<User>(res.links);
links.next?.toQueryString();          // query string for the next page, if any
links.previous?.page(1);              // each link is a full PaginateQueryBuilder

nextPageQueryString(res.links);       // shortcut: next page query string or undefined
fromUrl<User>(res.links.current);     // parse any full URL (or path?query) into a builder
```

### Immutable updates

`clone()` deep-copies a builder; `merge(partial)` mutates by overlaying a `PaginateParamsInput<T>`; `with(partial)` combines both — it returns a **new** builder, which fits UI state stores:

```ts
const base = createPaginateParams<User>().limit(20).sortBy('name', 'ASC');

const page2 = base.with({ page: 2 });                 // base is untouched
const filtered = base.with({ filter: { name: eq('John') } });
```

When `sortBy` is provided in the partial it replaces the existing sort list; filters are overlaid per column.

## API

- **createPaginateParams&lt;T&gt;(input?)** — returns a `PaginateQueryBuilder<T>`. Accepts an optional `PaginateParamsInput<T>` object to pre-populate the builder (e.g. `createPaginateParams<User>({ page: 2, filter: { name: eq('John') } })`).
- **fromQueryString&lt;T&gt;(qs)** — parse a query string (e.g. from `window.location.search`) back into a `PaginateQueryBuilder<T>` for manipulation or round-tripping.
- **fromUrl&lt;T&gt;(url)** (alias **fromLink**) — parse a full URL or `path?query` string into a builder.
- **parsePaginatedLinks&lt;T&gt;(links)** — parse a response's `links` into `{ first?, previous?, current, next?, last? }` builders (`ParsedPaginatedLinks<T>`).
- **nextPageQueryString(links)** — the next page's query string, or `undefined` if there is no next page.
- **PaginateQueryBuilder&lt;T&gt;** — fluent builder with:
  - `.page(n)`, `.limit(n)`, `.sortBy(column, 'ASC'|'DESC')`, `.sortByPolymorphic(columns, dir)`, `.search(term)`, `.searchBy(columns)`, `.select(columns)`, `.cursor(c)`, `.withDeleted(bool)`
  - `.filter(column, tokenOrTokens)`, `.removeFilter(column)`
  - `.filterExpression(astOrString)` / `.expr(...)`, `.removeFilterExpression()`, `.getFilterExpression()`
  - `.merge(partial)` — mutate by overlaying a `PaginateParamsInput<T>`
  - `.with(partial)` — immutable variant of `merge`; returns a new builder
  - `.toParams()` — `Record<string, string | string[]>`
  - `.toQueryString()` — `?key=value&...`
  - `.toURLSearchParams()` — native `URLSearchParams` instance
  - `.clone()` — deep copy of the builder; mutations on the clone do not affect the original
- **Expression helpers** — `leaf(column, token)`, `and(...exprs)`, `or(...exprs)`, `notExpr(expr)`, `parseFilterExpression(str, maxComplexity?)`, `stringifyFilterExpression(ast)`, `DEFAULT_FILTER_EXPRESSION_MAX_COMPLEXITY`, and the `FilterExpression` AST type.
- **ColumnPath&lt;T&gt;** — type of allowed column paths for `T` (including nested, e.g. `offers.price`).
- **toQueryString(params)** — serialize a params object to a query string.
- **PaginatedResponse&lt;T&gt;**, **PaginatedMeta**, **PaginatedLinks** — TypeScript interfaces matching the nestjs-paginate response shape, ready to use as response types in fetch/axios calls. In cursor pagination mode `meta.totalItems`, `meta.currentPage`, and `meta.totalPages` are omitted and `meta.cursor` carries the next cursor.
- **Enums** — `FilterOperator`, `FilterSuffix`, `FilterQuantifier`, plus the `SortDirection` type.

## Examples

Full working examples for React, Vue 3, and Angular are in the [`example/`](./example) directory. Each includes a composable/hook/service and a ready-to-use table component.

### React

```tsx
import { usePaginatedUsers } from './usePaginatedUsers';

function UsersPage() {
  const { data, meta, loading, page, setPage, setSearch, setSort } =
    usePaginatedUsers({ baseUrl: 'https://api.example.com' });

  if (loading) return <p>Loading…</p>;
  return (
    <>
      <input onChange={e => setSearch(e.target.value)} placeholder="Search…" />
      <table>
        <tbody>
          {data.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td></tr>)}
        </tbody>
      </table>
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
      <button disabled={page === meta?.totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { usePaginatedUsers } from './usePaginatedUsers';

const { data, meta, loading, page, setPage, setSearch } =
  usePaginatedUsers({ baseUrl: 'https://api.example.com' });
</script>

<template>
  <input @input="e => setSearch((e.target as HTMLInputElement).value)" placeholder="Search…" />
  <p v-if="loading">Loading…</p>
  <table v-else>
    <tr v-for="u in data" :key="u.id"><td>{{ u.name }}</td><td>{{ u.email }}</td></tr>
  </table>
  <button :disabled="page === 1" @click="setPage(page - 1)">Prev</button>
  <button :disabled="page === meta?.totalPages" @click="setPage(page + 1)">Next</button>
</template>
```

### Angular

```ts
import { UserPaginateService } from './user-paginate.service';

@Component({ standalone: true, template: `...` })
export class UsersTableComponent {
  private svc = inject(UserPaginateService);
  users = signal<User[]>([]);

  ngOnInit() {
    this.svc.setBaseUrl('https://api.example.com');
    this.svc.loadUsers({ page: 1, limit: 10, sortBy: 'name', sortDir: 'ASC' })
      .then(res => this.users.set(res.data));
  }
}
```

See [`example/README.md`](./example/README.md) for full setup instructions for each framework.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines and [DEVELOPMENT.md](.github/DEVELOPMENT.md) for local setup and scripts.

Releases to npm are automated via [release-it](https://github.com/release-it/release-it) on the default branch.

## Credits

This library was inspired by [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate/tree/master) by [ppetzold](https://github.com/ppetzold). The query string format (pagination, sort, search, filter, etc.) is designed to work with backends using that package.

## License

MIT
