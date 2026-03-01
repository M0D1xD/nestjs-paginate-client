/**
 * React hook: fetch paginated users using nestjs-paginate-client.
 * Use with any NestJS backend that uses nestjs-paginate.
 */
import { useState, useEffect, useCallback } from 'react';
import { createPaginateParams, eq, in as filterIn } from 'nestjs-paginate-client';

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
  links: { first: string; previous?: string; next?: string; last: string };
};

export type UsePaginatedUsersOptions = {
  baseUrl: string;
  initialPage?: number;
  initialLimit?: number;
  initialSearch?: string;
  initialSortBy?: 'name' | 'email' | 'createdAt';
  initialSortDir?: 'ASC' | 'DESC';
  roleFilter?: string;
  rolesFilter?: string[];
};

export function usePaginatedUsers(options: UsePaginatedUsersOptions) {
  const {
    baseUrl,
    initialPage = 1,
    initialLimit = 10,
    initialSearch = '',
    initialSortBy = 'name',
    initialSortDir = 'ASC',
    roleFilter,
    rolesFilter,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<typeof initialSortBy>(initialSortBy);
  const [sortDir, setSortDir] = useState<typeof initialSortDir>(initialSortDir);
  const [role] = useState(roleFilter);
  const [roles] = useState<string[] | undefined>(rolesFilter);

  const [data, setData] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const builder = createPaginateParams<User>()
        .page(page)
        .limit(limit)
        .sortBy(sortBy, sortDir);

      if (search.trim()) {
        builder.search(search.trim()).searchBy(['name', 'email']);
      }
      if (role) {
        builder.filter('role', eq(role));
      }
      if (roles?.length) {
        builder.filter('role', filterIn(roles));
      }

      const queryString = builder.toQueryString();
      const url = `${baseUrl.replace(/\/$/, '')}/users${queryString ? queryString : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaginatedResponse<User> = await res.json();
      setData(json.data);
      setMeta(json.meta);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, page, limit, search, sortBy, sortDir, role, roles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const goToPage = (p: number) => {
    if (meta && p >= 1 && p <= meta.totalPages) setPage(p);
  };

  const applySearch = (term: string) => {
    setSearch(term);
    setPage(1);
  };

  const applySort = (column: typeof sortBy, direction: typeof sortDir) => {
    setSortBy(column);
    setSortDir(direction);
    setPage(1);
  };

  return {
    data,
    meta,
    loading,
    error,
    page,
    limit,
    search,
    sortBy,
    sortDir,
    setPage: goToPage,
    setLimit: (n: number) => {
      setLimit(n);
      setPage(1);
    },
    setSearch: applySearch,
    setSort: applySort,
    refetch: fetchUsers,
  };
}
