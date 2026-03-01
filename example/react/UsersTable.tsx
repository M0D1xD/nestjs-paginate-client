/**
 * React example: paginated users table with search, sort, and filters.
 *
 * Usage:
 *   import { UsersTable } from './UsersTable';
 *   <UsersTable baseUrl="https://api.example.com" />
 *
 * Requires: npm install react nestjs-paginate-client
 */
import React from 'react';
import { usePaginatedUsers } from './usePaginatedUsers';

type UsersTableProps = {
  baseUrl: string;
};

export function UsersTable({ baseUrl }: UsersTableProps) {
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
    baseUrl,
    initialLimit: 10,
    initialSortBy: 'name',
    initialSortDir: 'ASC',
  });

  const toggleSort = (column: 'name' | 'email' | 'createdAt') => {
    const nextDir = sortBy === column && sortDir === 'ASC' ? 'DESC' : 'ASC';
    setSort(column, nextDir);
  };

  if (error) {
    return (
      <div role="alert" style={{ color: 'red' }}>
        Error: {error.message}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Users</h1>

      <input
        type="search"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, padding: 8, width: 280 }}
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>
                  <button type="button" onClick={() => toggleSort('name')}>
                    Name {sortBy === 'name' && (sortDir === 'ASC' ? '↑' : '↓')}
                  </button>
                </th>
                <th style={thStyle}>
                  <button type="button" onClick={() => toggleSort('email')}>
                    Email {sortBy === 'email' && (sortDir === 'ASC' ? '↑' : '↓')}
                  </button>
                </th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>
                  <button type="button" onClick={() => toggleSort('createdAt')}>
                    Created {sortBy === 'createdAt' && (sortDir === 'ASC' ? '↑' : '↓')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => (
                <tr key={user.id}>
                  <td style={tdStyle}>{user.name}</td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>{user.role}</td>
                  <td style={tdStyle}>{user.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>
                Page {meta.currentPage} of {meta.totalPages} ({meta.totalItems} total)
              </span>
              <button
                type="button"
                disabled={meta.currentPage <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.currentPage >= meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: '2px solid #ddd',
};
const tdStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #eee',
};
