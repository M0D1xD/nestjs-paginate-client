/**
 * Angular example: users table with pagination, search, and sort.
 *
 * Usage:
 *   Import in your module:
 *     import { UsersTableComponent } from './users-table.component';
 *     declarations: [UsersTableComponent]
 *   In a parent component set the API base URL then use:
 *     <app-users-table [baseUrl]="apiBaseUrl"></app-users-table>
 *
 * Requires: nestjs-paginate-client, Angular 17+ (standalone) or add to NgModule.
 */
import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  UserPaginateService,
  type User,
  type PaginationMeta,
  type UserListState,
} from './user-paginate.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-users-table',
  template: `
    <div class="users-table">
      <h1>Users</h1>

      <input
        type="search"
        placeholder="Search by name or email..."
        [value]="search()"
        (input)="onSearch($any($event.target).value)"
        class="search-input"
      />

      @if (error()) {
        <div role="alert" class="error">Error: {{ error() }}</div>
      } @else if (loading()) {
        <p>Loading...</p>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th><button type="button" (click)="toggleSort('name')">Name {{ sortInd('name') }}</button></th>
              <th><button type="button" (click)="toggleSort('email')">Email {{ sortInd('email') }}</button></th>
              <th>Role</th>
              <th><button type="button" (click)="toggleSort('createdAt')">Created {{ sortInd('createdAt') }}</button></th>
            </tr>
          </thead>
          <tbody>
            @for (user of data(); track user.id) {
              <tr>
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.role }}</td>
                <td>{{ user.createdAt }}</td>
              </tr>
            }
          </tbody>
        </table>

        @if (meta(); as m) {
          <div class="pagination">
            <span>Page {{ m.currentPage }} of {{ m.totalPages }} ({{ m.totalItems }} total)</span>
            <button type="button" [disabled]="m.currentPage <= 1" (click)="setPage(page() - 1)">Previous</button>
            <button type="button" [disabled]="m.currentPage >= m.totalPages" (click)="setPage(page() + 1)">Next</button>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .users-table { padding: 16px; font-family: sans-serif; }
      .search-input { margin-bottom: 16px; padding: 8px; width: 280px; }
      .error { color: red; }
      .table { width: 100%; border-collapse: collapse; }
      .table th, .table td { text-align: left; padding: 8px; }
      .table th { border-bottom: 2px solid #ddd; }
      .table td { border-bottom: 1px solid #eee; }
      .pagination { margin-top: 16px; display: flex; align-items: center; gap: 8px; }
    `,
  ],
})
export class UsersTableComponent implements OnInit {
  @Input({ required: true }) baseUrl!: string;

  private paginate = inject(UserPaginateService);

  page = signal(1);
  limit = signal(10);
  search = signal('');
  sortBy = signal<'name' | 'email' | 'createdAt'>('name');
  sortDir = signal<'ASC' | 'DESC'>('ASC');

  data = signal<User[]>([]);
  meta = signal<PaginationMeta | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private state = computed<UserListState>(() => ({
    page: this.page(),
    limit: this.limit(),
    search: this.search(),
    sortBy: this.sortBy(),
    sortDir: this.sortDir(),
  }));

  ngOnInit(): void {
    this.paginate.setBaseUrl(this.baseUrl);
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.paginate.loadUsers(this.state());
      this.data.set(res.data);
      this.meta.set(res.meta);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
    }
  }

  setPage(p: number): void {
    const m = this.meta();
    if (m && p >= 1 && p <= m.totalPages) {
      this.page.set(p);
      this.load();
    }
  }

  onSearch(term: string): void {
    this.search.set(term);
    this.page.set(1);
    this.load();
  }

  toggleSort(column: 'name' | 'email' | 'createdAt'): void {
    const nextDir = this.sortBy() === column && this.sortDir() === 'ASC' ? 'DESC' : 'ASC';
    this.sortBy.set(column);
    this.sortDir.set(nextDir);
    this.page.set(1);
    this.load();
  }

  sortInd(column: 'name' | 'email' | 'createdAt'): string {
    if (this.sortBy() !== column) return '';
    return this.sortDir() === 'ASC' ? '↑' : '↓';
  }
}

