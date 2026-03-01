<!--
  Vue 3 example: paginated users table with search and sort.

  Usage:
    import UsersTable from './UsersTable.vue';
    <UsersTable base-url="https://api.example.com" />

  Requires: npm install vue nestjs-paginate-client
-->
<template>
  <div class="users-table">
    <h1>Users</h1>

    <input
      v-model="searchInput"
      type="search"
      placeholder="Search by name or email..."
      class="search-input"
      @input="onSearchInput"
    />

    <div v-if="error" role="alert" class="error">
      Error: {{ error.message }}
    </div>

    <p v-else-if="loading">Loading...</p>

    <template v-else>
      <table class="table">
        <thead>
          <tr>
            <th>
              <button type="button" @click="toggleSort('name')">
                Name {{ sortIndicator('name') }}
              </button>
            </th>
            <th>
              <button type="button" @click="toggleSort('email')">
                Email {{ sortIndicator('email') }}
              </button>
            </th>
            <th>Role</th>
            <th>
              <button type="button" @click="toggleSort('createdAt')">
                Created {{ sortIndicator('createdAt') }}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in data" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
            <td>{{ user.createdAt }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="meta" class="pagination">
        <span>
          Page {{ meta.currentPage }} of {{ meta.totalPages }} ({{ meta.totalItems }} total)
        </span>
        <button
          type="button"
          :disabled="meta.currentPage <= 1"
          @click="setPage(page - 1)"
        >
          Previous
        </button>
        <button
          type="button"
          :disabled="meta.currentPage >= meta.totalPages"
          @click="setPage(page + 1)"
        >
          Next
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePaginatedUsers } from './usePaginatedUsers';

const props = defineProps<{
  baseUrl: string;
}>();

const {
  data,
  meta,
  loading,
  error,
  page,
  search,
  sortBy,
  sortDir,
  setSearch,
  setPage,
  setSort,
} = usePaginatedUsers({
  baseUrl: props.baseUrl,
  initialLimit: 10,
  initialSortBy: 'name',
  initialSortDir: 'ASC',
});

const searchInput = ref(search.value);

function onSearchInput() {
  setSearch(searchInput.value);
}

function toggleSort(column: 'name' | 'email' | 'createdAt') {
  const nextDir = sortBy.value === column && sortDir.value === 'ASC' ? 'DESC' : 'ASC';
  setSort(column, nextDir);
}

function sortIndicator(column: 'name' | 'email' | 'createdAt') {
  if (sortBy.value !== column) return '';
  return sortDir.value === 'ASC' ? '↑' : '↓';
}
</script>

<style scoped>
.users-table {
  padding: 16px;
  font-family: sans-serif;
}
.search-input {
  margin-bottom: 16px;
  padding: 8px;
  width: 280px;
}
.error {
  color: red;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th,
.table td {
  text-align: left;
  padding: 8px;
}
.table th {
  border-bottom: 2px solid #ddd;
}
.table td {
  border-bottom: 1px solid #eee;
}
.pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
