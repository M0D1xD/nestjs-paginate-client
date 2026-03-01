/**
 * Angular example: service that builds paginate params and fetches users.
 *
 * Usage:
 *   Provide UserPaginateService in your app or feature module.
 *   Inject in a component and call loadUsers() with state; use getQueryParams() for URL sync if needed.
 *
 * Requires: npm install nestjs-paginate-client
 */
import { Injectable } from '@angular/core';
import { createPaginateParams, eq, in as filterIn } from 'nestjs-paginate-client';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links: { first: string; previous?: string; next?: string; last: string };
}

export interface UserListState {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortDir?: 'ASC' | 'DESC';
  role?: string;
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class UserPaginateService {
  private baseUrl = '';

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  /**
   * Build query params for the given state. Use toParams() for HttpClient params
   * or toQueryString() for router URL / window.location.
   */
  getQueryParams(state: UserListState): Record<string, string | string[]> {
    const sortBy = (state.sortBy ?? 'name') as 'name' | 'email' | 'createdAt';
    const sortDir = state.sortDir ?? 'ASC';
    const builder = createPaginateParams<User>()
      .page(state.page ?? 1)
      .limit(state.limit ?? 10)
      .sortBy(sortBy, sortDir);

    if (state.search?.trim()) {
      builder.search(state.search.trim()).searchBy(['name', 'email']);
    }
    if (state.role) {
      builder.filter('role', eq(state.role));
    }
    if (state.roles?.length) {
      const roles = state.roles as (string | number)[];
      builder.filter('role', filterIn(roles));
    }

    return builder.toParams();
  }

  getQueryString(state: UserListState): string {
    const sortBy = (state.sortBy ?? 'name') as 'name' | 'email' | 'createdAt';
    const sortDir = state.sortDir ?? 'ASC';
    const builder = createPaginateParams<User>()
      .page(state.page ?? 1)
      .limit(state.limit ?? 10)
      .sortBy(sortBy, sortDir);

    if (state.search?.trim()) {
      builder.search(state.search.trim()).searchBy(['name', 'email']);
    }
    if (state.role) {
      builder.filter('role', eq(state.role));
    }
    if (state.roles?.length) {
      const roles = state.roles as (string | number)[];
      builder.filter('role', filterIn(roles));
    }

    return builder.toQueryString();
  }

  async loadUsers(state: UserListState): Promise<PaginatedResponse<User>> {
    const queryString = this.getQueryString(state);
    const url = `${this.baseUrl}/users${queryString ? queryString : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
