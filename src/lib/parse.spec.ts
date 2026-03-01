import { describe, it, expect } from 'vitest';
import { createPaginateParams, eq, or } from '..';
import { fromQueryString } from './parse';

type User = { id: number; name: string; email: string };

describe('fromQueryString', () => {
  it('returns empty builder for empty string', () => {
    expect(fromQueryString<User>('').toParams()).toEqual({});
    expect(fromQueryString<User>('?').toParams()).toEqual({});
  });

  it('parses page and limit', () => {
    const params = fromQueryString<User>('?page=2&limit=5').toParams();
    expect(params.page).toBe('2');
    expect(params.limit).toBe('5');
  });

  it('parses repeated sortBy keys', () => {
    const params = fromQueryString<User>('?sortBy=name%3AASC&sortBy=email%3ADESC').toParams();
    expect(params.sortBy).toEqual(['name:ASC', 'email:DESC']);
  });

  it('parses search and cursor', () => {
    const params = fromQueryString<User>('?search=john&cursor=abc123').toParams();
    expect(params.search).toBe('john');
    expect(params.cursor).toBe('abc123');
  });

  it('parses repeated searchBy keys', () => {
    const params = fromQueryString<User>('?searchBy=name&searchBy=email').toParams();
    expect(params.searchBy).toEqual(['name', 'email']);
  });

  it('parses select (comma-split)', () => {
    const params = fromQueryString<User>('?select=id%2Cname%2Cemail').toParams();
    expect(params.select).toBe('id,name,email');
  });

  it('parses withDeleted=true', () => {
    const params = fromQueryString<User>('?withDeleted=true').toParams();
    expect(params.withDeleted).toBe('true');
  });

  it('parses withDeleted=false (does not serialize due to builder fix)', () => {
    const params = fromQueryString<User>('?withDeleted=false').toParams();
    expect(params.withDeleted).toBeUndefined();
  });

  it('parses a single filter value', () => {
    const params = fromQueryString<User>('?filter.name=%24eq%3AJohn').toParams();
    expect(params['filter.name']).toBe('$eq:John');
  });

  it('parses multiple values for the same filter key into array', () => {
    const params = fromQueryString<User>(
      '?filter.name=%24or%3A%24eq%3AA&filter.name=%24or%3A%24eq%3AB',
    ).toParams();
    expect(params['filter.name']).toEqual(['$or:$eq:A', '$or:$eq:B']);
  });

  it('round-trips through toQueryString and back', () => {
    const original = createPaginateParams<User>()
      .page(1)
      .limit(10)
      .sortBy('name', 'ASC')
      .search('test')
      .searchBy(['name', 'email'])
      .select(['id', 'name'])
      .filter('name', or(eq('A')))
      .filter('name', or(eq('B')));

    const qs = original.toQueryString();
    const parsed = fromQueryString<User>(qs);

    expect(parsed.toParams()).toEqual(original.toParams());
  });
});
