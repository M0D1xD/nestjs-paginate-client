/**
 * Core usage: build paginate query params and use with fetch/axios.
 * Copy this pattern into your API layer; then use the same params in React/Vue/Angular.
 */
import {
  createPaginateParams,
  eq,
  in as filterIn,
} from 'nestjs-paginate-client';

// Define entity types that match your backend (and nestjs-paginate config)
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

/**
 * Build query params for a paginated, filterable, sortable list.
 * Use toQueryString() for URL or toParams() for axios/fetch.
 */
export function buildUserListParams(options: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortDir?: 'ASC' | 'DESC';
  role?: string;
  roleIn?: string[];
}) {
  const builder = createPaginateParams<User>()
    .page(options.page ?? 1)
    .limit(options.limit ?? 10)
    .sortBy(options.sortBy ?? 'name', options.sortDir ?? 'ASC');

  if (options.search?.trim()) {
    builder.search(options.search.trim()).searchBy(['name', 'email']);
  }
  if (options.role) {
    builder.filter('role', eq(options.role));
  }
  if (options.roleIn?.length) {
    const roles = options.roleIn as (string | number)[];
    builder.filter('role', filterIn(roles));
  }

  return builder;
}

/** Example: fetch from a NestJS backend that uses nestjs-paginate */
export async function fetchUsers(options: Parameters<typeof buildUserListParams>[0] & { baseUrl: string }) {
  const { baseUrl, ...paramsOptions } = options;
  const params = buildUserListParams(paramsOptions);
  const queryString = params.toQueryString();
  const url = `${baseUrl.replace(/\/$/, '')}/users${queryString ? `?${queryString.slice(1)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{
    data: User[];
    meta: { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number };
    links: { first: string; previous?: string; next?: string; last: string };
  }>;
}

