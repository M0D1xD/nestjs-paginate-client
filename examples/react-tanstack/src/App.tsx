import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { btw, createPaginateParams, eq, gte, ilike, inOp, lte } from 'nestjs-paginate-client';
import type { ColumnPath, SortDirection } from 'nestjs-paginate-client';
import { useMemo, useState } from 'react';
import { fetchUsers } from './mock/api';
import type { User } from './mock/data';

const ROLES = ['admin', 'editor', 'viewer'] as const;

type Filters = {
  roles: string[];
  activeOnly: boolean;
  minAge: string;
  maxAge: string;
  city: string;
};

const EMPTY_FILTERS: Filters = { roles: [], activeOnly: false, minAge: '', maxAge: '', city: '' };

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('firstName', { header: 'First name' }),
  columnHelper.accessor('lastName', { header: 'Last name' }),
  columnHelper.accessor('email', { header: 'Email' }),
  columnHelper.accessor('age', { header: 'Age' }),
  columnHelper.accessor('role', { header: 'Role' }),
  columnHelper.accessor('isActive', {
    header: 'Active',
    cell: (ctx) => (ctx.getValue() ? 'Yes' : 'No'),
    enableSorting: false,
  }),
  // Nested relation column — the accessor id doubles as the dot-path sent to the backend.
  columnHelper.accessor((row) => row.address.city, { id: 'address.city', header: 'City' }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (ctx) => ctx.getValue().slice(0, 10),
  }),
];

export default function App() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: false }]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Any change that narrows the result set jumps back to the first page.
  const updateSearch = (value: string) => {
    setSearch(value);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };
  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  // UI state → nestjs-paginate query string. This is the whole point of the library:
  // everything below is type-checked against `User`, including nested dot-paths.
  const queryString = useMemo(() => {
    const builder = createPaginateParams<User>({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: sorting.map(
        (s) => [s.id as ColumnPath<User>, s.desc ? 'DESC' : 'ASC'] as [ColumnPath<User>, SortDirection],
      ),
    });

    if (search.trim()) {
      builder.search(search.trim()).searchBy(['firstName', 'lastName', 'email']);
    }
    if (filters.roles.length) {
      builder.filter('role', inOp(filters.roles));
    }
    if (filters.activeOnly) {
      builder.filter('isActive', eq(true));
    }
    if (filters.minAge && filters.maxAge) {
      builder.filter('age', btw(Number(filters.minAge), Number(filters.maxAge)));
    } else if (filters.minAge) {
      builder.filter('age', gte(Number(filters.minAge)));
    } else if (filters.maxAge) {
      builder.filter('age', lte(Number(filters.maxAge)));
    }
    if (filters.city.trim()) {
      builder.filter('address.city', ilike(filters.city.trim()));
    }

    return builder.toQueryString();
  }, [pagination, sorting, search, filters]);

  // The query string doubles as the cache key: TanStack Query refetches exactly
  // when the effective request changes, and caches page-by-page.
  const { data, isFetching, isError } = useQuery({
    queryKey: ['users', queryString],
    queryFn: () => fetchUsers(queryString),
    placeholderData: keepPreviousData,
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { pagination, sorting },
    manualPagination: true,
    manualSorting: true,
    pageCount: data?.meta.totalPages ?? -1,
    rowCount: data?.meta.totalItems,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const toggleRole = (role: string) => {
    updateFilters({
      roles: filters.roles.includes(role)
        ? filters.roles.filter((r) => r !== role)
        : [...filters.roles, role],
    });
  };

  return (
    <main className="page">
      <h1>nestjs-paginate-client + React + TanStack</h1>
      <p className="subtitle">
        Server-side pagination, sorting, search and filters — the query string below is built with{' '}
        <code>createPaginateParams&lt;User&gt;()</code> and served by an in-browser mock backend.
      </p>

      <section className="toolbar">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
        />
        <div className="roles">
          {ROLES.map((role) => (
            <label key={role}>
              <input
                type="checkbox"
                checked={filters.roles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
        <input
          type="number"
          className="age"
          placeholder="Min age"
          value={filters.minAge}
          onChange={(e) => updateFilters({ minAge: e.target.value })}
        />
        <input
          type="number"
          className="age"
          placeholder="Max age"
          value={filters.maxAge}
          onChange={(e) => updateFilters({ maxAge: e.target.value })}
        />
        <input
          type="text"
          placeholder="City contains…"
          value={filters.city}
          onChange={(e) => updateFilters({ city: e.target.value })}
        />
        <label>
          <input
            type="checkbox"
            checked={filters.activeOnly}
            onChange={(e) => updateFilters({ activeOnly: e.target.checked })}
          />
          Active only
        </label>
        <button
          type="button"
          onClick={() => {
            updateSearch('');
            updateFilters(EMPTY_FILTERS);
          }}
        >
          Reset
        </button>
      </section>

      <section className="query-preview">
        <span className="label">GET /api/users</span>
        <code>{queryString || '(no params)'}</code>
      </section>

      {isError ? (
        <p className="error">Failed to load users.</p>
      ) : (
        <div className={isFetching ? 'table-wrap loading' : 'table-wrap'}>
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getCanSort() ? 'sortable' : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="pagination">
        <button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
          «
        </button>
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          ‹ Prev
        </button>
        <span>
          Page {data?.meta.currentPage ?? '…'} of {data?.meta.totalPages ?? '…'} (
          {data?.meta.totalItems ?? '…'} users)
        </span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next ›
        </button>
        <button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
          »
        </button>
        <select
          value={pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          {[5, 10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </section>
    </main>
  );
}
