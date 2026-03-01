import { describe, it, expect } from 'vitest';
import { createPaginateParams, eq, gte, inOp, or } from '..';

// Course is the entity referenced by UserCourse.courseId (kept for domain typing)
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- domain type for documentation
type Course = { id: number; name: string; price: number };
type UserCourse = { id: number; userId: number; courseId: number; registerDate: Date; expiryDate: Date };
type User = { id: number; name: string; email: string; courses: UserCourse[] };

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
    const params = createPaginateParams<User>().select(['id', 'name', 'email']).toParams();
    expect(params.select).toBe('id,name,email');
  });

  it('builds filter with filter.<column> keys', () => {
    const params = createPaginateParams<User>()
      .filter('name', eq('John'))
      .filter('courses.courseId', gte(1))
      .toParams();
    expect(params['filter.name']).toBe('$eq:John');
    expect(params['filter.courses.courseId']).toBe('$gte:1');
  });

  it('builds single $in filter token', () => {
    const params = createPaginateParams<User>()
      .filter('courses.courseId', inOp([1, 2]))
      .toParams();
    expect(params['filter.courses.courseId']).toBe('$in:1,2');
  });

  it('accumulates multiple filter calls on the same column into an array', () => {
    const params = createPaginateParams<User>()
      .filter('name', or(eq('A')))
      .filter('name', or(eq('B')))
      .toParams();
    expect(params['filter.name']).toEqual(['$or:$eq:A', '$or:$eq:B']);
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

  it('empty builder toQueryString() returns empty string', () => {
    expect(createPaginateParams<User>().toQueryString()).toBe('');
  });

  it('withDeleted(false) is not serialized', () => {
    const params = createPaginateParams<User>().withDeleted(false).toParams();
    expect(params.withDeleted).toBeUndefined();
  });

  it('clone() produces independent copy', () => {
    const original = createPaginateParams<User>().page(1).filter('name', eq('Alice'));
    const clone = original.clone();
    clone.page(2).filter('name', eq('Bob'));
    expect(original.toParams().page).toBe('1');
    expect(original.toParams()['filter.name']).toBe('$eq:Alice');
    expect(clone.toParams().page).toBe('2');
    expect(clone.toParams()['filter.name']).toEqual(['$eq:Alice', '$eq:Bob']);
  });

  it('toURLSearchParams() returns URLSearchParams with correct entries', () => {
    const usp = createPaginateParams<User>()
      .page(1)
      .sortBy('name', 'ASC')
      .sortBy('email', 'DESC')
      .toURLSearchParams();
    expect(usp instanceof URLSearchParams).toBe(true);
    expect(usp.get('page')).toBe('1');
    expect(usp.getAll('sortBy')).toEqual(['name:ASC', 'email:DESC']);
  });

  it('createPaginateParams() with input object initializes correctly', () => {
    const params = createPaginateParams<User>({ page: 1, filter: { name: eq('John') } }).toParams();
    expect(params.page).toBe('1');
    expect(params['filter.name']).toBe('$eq:John');
  });

  it('createPaginateParams() with sortBy array of tuples', () => {
    const params = createPaginateParams<User>({
      sortBy: [['name', 'ASC'], ['email', 'DESC']],
    }).toParams();
    expect(params.sortBy).toEqual(['name:ASC', 'email:DESC']);
  });

  it('createPaginateParams() with single sortBy tuple', () => {
    const params = createPaginateParams<User>({ sortBy: ['name', 'ASC'] }).toParams();
    expect(params.sortBy).toEqual(['name:ASC']);
  });
});
