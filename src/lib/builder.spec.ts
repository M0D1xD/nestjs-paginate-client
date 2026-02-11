import { describe, it, expect } from 'vitest';
import { createPaginateParams, eq, gte, inOp } from '..';

type Offer = { name: string; price: number };
type User = { name: string; email: string; offers: Offer[] };

describe('PaginateQueryBuilder', () => {
  it('builds params with page and limit', () => {
    const params = createPaginateParams<User>().page(1).limit(10).toParams();
    expect(params.page).toBe('1');
    expect(params.limit).toBe('10');
  });

  it('builds sortBy as array of column:direction', () => {
    const params = createPaginateParams<User>()
      .sortBy('name', 'ASC')
      .sortBy('email', 'DESC')
      .toParams();
    expect(params.sortBy).toEqual(['name:ASC', 'email:DESC']);
  });

  it('builds search and searchBy', () => {
    const params = createPaginateParams<User>()
      .search('john')
      .searchBy(['name', 'email'])
      .toParams();
    expect(params.search).toBe('john');
    expect(params.searchBy).toEqual(['name', 'email']);
  });

  it('builds select as comma-separated string', () => {
    const params = createPaginateParams<User>().select(['name', 'email']).toParams();
    expect(params.select).toBe('name,email');
  });

  it('builds filter with filter.<column> keys', () => {
    const params = createPaginateParams<User>()
      .filter('name', eq('John'))
      .filter('offers.price', gte(100))
      .toParams();
    expect(params['filter.name']).toBe('$eq:John');
    expect(params['filter.offers.price']).toBe('$gte:100');
  });

  it('builds filter with multiple tokens (array)', () => {
    const params = createPaginateParams<User>()
      .filter('offers.name', inOp(['A', 'B']))
      .toParams();
    expect(params['filter.offers.name']).toBe('$in:A,B');
  });

  it('toQueryString produces valid query string', () => {
    const qs = createPaginateParams<User>()
      .page(1)
      .limit(10)
      .sortBy('name', 'ASC')
      .filter('name', eq('John'))
      .toQueryString();
    expect(qs).toContain('page=1');
    expect(qs).toContain('limit=10');
    expect(qs).toContain('sortBy=name%3AASC');
    expect(qs).toContain('filter.name=');
    expect(qs.startsWith('?')).toBe(true);
  });

  it('toParams returns object suitable for axios/fetch', () => {
    const params = createPaginateParams<User>()
      .page(2)
      .limit(20)
      .cursor('abc')
      .withDeleted(true)
      .toParams();
    expect(params.page).toBe('2');
    expect(params.limit).toBe('20');
    expect(params.cursor).toBe('abc');
    expect(params.withDeleted).toBe('true');
  });
});
