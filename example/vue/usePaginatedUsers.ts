/**
 * Vue 3 Composition API: composable for paginated users with nestjs-paginate-client.
 */
import { ref, watch, type Ref } from 'vue';
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

  const page = ref(initialPage);
  const limit = ref(initialLimit);
  const search = ref(initialSearch);
  const sortBy = ref<'name' | 'email' | 'createdAt'>(initialSortBy);
  const sortDir = ref<'ASC' | 'DESC'>(initialSortDir);
  const role = ref(roleFilter);
  const roles = ref<string[] | undefined>(rolesFilter);

  const data = ref<User[]>([]);
  const meta = ref<PaginationMeta | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      const builder = createPaginateParams<User>()
        .page(page.value)
        .limit(limit.value)
        .sortBy(sortBy.value, sortDir.value);

      if (search.value.trim()) {
        builder.search(search.value.trim()).searchBy(['name', 'email']);
      }
      if (role.value) {
        builder.filter('role', eq(role.value));
      }
      if (roles.value?.length) {
        builder.filter('role', filterIn(roles.value));
      }

      const queryString = builder.toQueryString();
      const url = `${baseUrl.replace(/\/$/, '')}/users${queryString ? queryString : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaginatedResponse<User> = await res.json();
      data.value = json.data;
      meta.value = json.meta;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading.value = false;
    }
  }

  watch([page, limit, search, sortBy, sortDir, role, roles], () => fetchUsers(), {
    immediate: true,
  });

  function goToPage(p: number) {
    if (meta.value && p >= 1 && p <= meta.value.totalPages) page.value = p;
  }

  function applySearch(term: string) {
    search.value = term;
    page.value = 1;
  }

  function applySort(column: 'name' | 'email' | 'createdAt', direction: 'ASC' | 'DESC') {
    sortBy.value = column;
    sortDir.value = direction;
    page.value = 1;
  }

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
      limit.value = n;
      page.value = 1;
    },
    setSearch: applySearch,
    setSort: applySort,
    refetch: fetchUsers,
  };
}
