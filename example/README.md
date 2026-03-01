# nestjs-paginate-client examples

Real-world usage of `nestjs-paginate-client` in TypeScript and popular frontend frameworks. Each example assumes a NestJS backend that uses [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate) and exposes a paginated `GET /users` (or similar) endpoint.

## Core (TypeScript)

**`index.ts`** — Build query params and fetch without a UI framework.

- `buildUserListParams(options)` — returns a builder; call `.toQueryString()` or `.toParams()`.
- `fetchUsers({ baseUrl, page, limit, search, sortBy, sortDir, role, roleIn })` — example fetch.

Run from repo root (after `pnpm install` and `pnpm build`):

```bash
node --experimental-strip-types example/index.ts
# or with ts-node: npx ts-node example/index.ts
```

---

## React

**`react/usePaginatedUsers.ts`** — Custom hook that keeps page, limit, search, sort, and filters in state and fetches when they change.

**`react/UsersTable.tsx`** — Table component using the hook: search input, sortable columns, previous/next pagination.

### Setup

In your React app:

```bash
npm install nestjs-paginate-client
```

Copy `usePaginatedUsers.ts` and `UsersTable.tsx` into your project (or import from the example path). Use the table:

```tsx
import { UsersTable } from './UsersTable';

<UsersTable baseUrl="https://api.example.com" />
```

---

## Vue 3

**`vue/usePaginatedUsers.ts`** — Composable (refs + `watch`) that fetches when page, limit, search, sort, or filters change.

**`vue/UsersTable.vue`** — Table component: search, sortable headers, pagination.

### Setup

In your Vue 3 app:

```bash
npm install nestjs-paginate-client
```

Copy the composable and component, then:

```vue
<template>
  <UsersTable base-url="https://api.example.com" />
</template>
<script setup>
import UsersTable from './UsersTable.vue';
</script>
```

---

## Angular

**`angular/user-paginate.service.ts`** — Injectable service with `setBaseUrl()`, `getQueryParams()`, `getQueryString()`, and `loadUsers(state)`.

**`angular/users-table.component.ts`** — Standalone component (Angular 17+) using signals and the service: search, sort, pagination.

### Setup

In your Angular app (Angular 17+ for the component’s control flow and standalone API):

```bash
npm install nestjs-paginate-client
```

Copy the service and component. Provide the service (e.g. `providedIn: 'root'` is already used in the service). Use the component:

```html
<app-users-table [baseUrl]="apiBaseUrl"></app-users-table>
```

For Angular &lt; 17, replace `@for` / `@if` with `*ngFor` / `*ngIf` and use an `NgModule` instead of standalone if needed.

---

## Backend contract

All examples expect a response shape compatible with nestjs-paginate, for example:

```json
{
  "data": [ { "id": 1, "name": "...", "email": "...", "role": "...", "createdAt": "..." } ],
  "meta": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 42,
    "itemsPerPage": 10
  },
  "links": { "first": "...", "previous": null, "next": "...", "last": "..." }
}
```

Query params (page, limit, sortBy, search, searchBy, filter.*) follow the [nestjs-paginate](https://github.com/ppetzold/nestjs-paginate) query format that this library produces.
