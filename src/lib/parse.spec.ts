import { describe, expect, it } from 'vitest';
import { createPaginateParams } from './builder';
import { and, leaf, or } from './expression';
import { eq } from './filter';
import { nextPageQueryString, parsePaginatedLinks } from './links';
import { fromQueryString, fromUrl } from './parse';

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

  it('treats + as space in query values', () => {
    const params = fromQueryString<User>('?search=John+Doe').toParams();
    expect(params.search).toBe('John Doe');
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
    const params = fromQueryString<User>('?filter.name=%24eq%3AA&filter.name=%24eq%3AB').toParams();
    expect(params['filter.name']).toEqual(['$eq:A', '$eq:B']);
  });

  it('parses filter= expression', () => {
    const params = fromQueryString<User>(
      '?filter=name%3D%24eq%3AMilo%20AND%20email%3D%24eq%3Aa%40b.c',
    ).toParams();
    expect(params.filter).toBe('name=$eq:Milo AND email=$eq:a@b.c');
  });

  it('skips malformed key/value pairs and keeps valid ones', () => {
    const params = fromQueryString<User>('?search=%E0%A4%A&page=2&limit=%E0%A4%A').toParams();
    expect(params.search).toBeUndefined();
    expect(params.page).toBe('2');
    expect(params.limit).toBeUndefined();
  });

  it('round-trips through toQueryString and back', () => {
    const original = createPaginateParams<User>()
      .page(1)
      .limit(10)
      .sortBy('name', 'ASC')
      .search('test')
      .searchBy(['name', 'email'])
      .select(['id', 'name'])
      .filter('name', [eq('A'), eq('B')])
      .filterExpression(or(leaf('email', eq('a@b.c')), leaf('email', eq('c@d.e'))));

    const qs = original.toQueryString();
    const parsed = fromQueryString<User>(qs);

    expect(parsed.toParams()).toEqual(original.toParams());
  });
});

describe('fromUrl and links', () => {
  it('fromUrl extracts query from absolute URL', () => {
    const params = fromUrl<User>('https://api.example.com/users?page=3&limit=10').toParams();
    expect(params.page).toBe('3');
    expect(params.limit).toBe('10');
  });

  it('parsePaginatedLinks builds next page params', () => {
    const links = parsePaginatedLinks<User>({
      current: 'https://api.example.com/users?page=1&limit=10',
      next: 'https://api.example.com/users?page=2&limit=10',
    });
    expect(links.next?.toParams().page).toBe('2');
    expect(
      nextPageQueryString({ current: links.current.toQueryString(), next: 'https://x/?page=2' }),
    ).toContain('page=2');
  });

  it('golden contract: typical list query shape', () => {
    const qs = createPaginateParams<User>({
      page: 2,
      limit: 5,
      sortBy: [['name', 'DESC']],
      search: 'i',
      filter: { name: eq('Milo') },
      filterExpression: and(leaf('email', eq('a@b.c'))),
    }).toQueryString();

    expect(qs).toContain('page=2');
    expect(qs).toContain('limit=5');
    expect(qs).toContain('sortBy=name%3ADESC');
    expect(qs).toContain('search=i');
    expect(qs).toContain('filter.name=');
    expect(qs).toContain('filter=');
  });
});
