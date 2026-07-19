import { describe, expect, it } from 'vitest';
import { createPaginateParams } from './builder';
import {
  and,
  leaf,
  notExpr,
  or,
  parseFilterExpression,
  stringifyFilterExpression,
} from './expression';
import { eq, gte, ilike, inOp, none, not, sw } from './filter';

type UserCourse = {
  id: number;
  userId: number;
  courseId: number;
  registerDate: Date;
  expiryDate: Date;
};

type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
  courses: UserCourse[];
  address: Address;
};

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

  it('builds polymorphic sortBy', () => {
    const params = createPaginateParams<User>()
      .sortByPolymorphic(['name', 'email'], 'DESC')
      .toParams();
    expect(params.sortBy).toEqual(['name~email:DESC']);
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

  it('replaces filter value when the same column is set twice', () => {
    const params = createPaginateParams<User>()
      .filter('name', eq('A'))
      .filter('name', eq('B'))
      .toParams();
    expect(params['filter.name']).toBe('$eq:B');
  });

  it('accepts an array token for AND filters on a single column', () => {
    const params = createPaginateParams<User>()
      .filter('name', [eq('A'), eq('B')])
      .toParams();
    expect(params['filter.name']).toEqual(['$eq:A', '$eq:B']);
  });

  it('builds filter= expression', () => {
    const params = createPaginateParams<User>()
      .filter('age', gte(3))
      .filterExpression(and(leaf('name', eq('Milo')), leaf('email', eq('a@b.c'))))
      .toParams();

    expect(params['filter.age']).toBe('$gte:3');
    expect(params.filter).toBe('name=$eq:Milo AND email=$eq:a@b.c');
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
    expect(clone.toParams()['filter.name']).toBe('$eq:Bob');
  });

  it('with() merges immutably', () => {
    const original = createPaginateParams<User>().page(1).sortBy('name', 'ASC');
    const next = original.with({ page: 2, sortBy: ['email', 'DESC'] });
    expect(original.toParams().page).toBe('1');
    expect(original.toParams().sortBy).toEqual(['name:ASC']);
    expect(next.toParams().page).toBe('2');
    expect(next.toParams().sortBy).toEqual(['email:DESC']);
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
      sortBy: [
        ['name', 'ASC'],
        ['email', 'DESC'],
      ],
    }).toParams();
    expect(params.sortBy).toEqual(['name:ASC', 'email:DESC']);
  });

  it('createPaginateParams() with single sortBy tuple', () => {
    const params = createPaginateParams<User>({ sortBy: ['name', 'ASC'] }).toParams();
    expect(params.sortBy).toEqual(['name:ASC']);
  });

  it('removeFilter() removes a previously added filter', () => {
    const params = createPaginateParams<User>()
      .filter('name', eq('John'))
      .filter('courses.courseId', gte(1))
      .removeFilter('name')
      .toParams();

    expect(params['filter.name']).toBeUndefined();
    expect(params['filter.courses.courseId']).toBe('$gte:1');
  });

  it('removeFilter() is a no-op when column has no filter', () => {
    const params = createPaginateParams<User>()
      .filter('name', eq('John'))
      .removeFilter('courses.courseId')
      .toParams();

    expect(params['filter.name']).toBe('$eq:John');
    expect(params['filter.courses.courseId']).toBeUndefined();
  });

  describe('address filters', () => {
    it('filters by exact city', () => {
      const params = createPaginateParams<User>().filter('address.city', eq('Berlin')).toParams();
      expect(params['filter.address.city']).toBe('$eq:Berlin');
    });

    it('filters by city with case-insensitive partial match', () => {
      const params = createPaginateParams<User>().filter('address.city', ilike('ber')).toParams();
      expect(params['filter.address.city']).toBe('$ilike:ber');
    });

    it('filters by street starts-with', () => {
      const params = createPaginateParams<User>().filter('address.street', sw('Main')).toParams();
      expect(params['filter.address.street']).toBe('$sw:Main');
    });

    it('filters by state using expression OR', () => {
      const params = createPaginateParams<User>()
        .filterExpression(or(leaf('address.state', eq('NY')), leaf('address.state', eq('CA'))))
        .toParams();

      expect(params.filter).toBe('address.state=$eq:NY OR address.state=$eq:CA');
    });

    it('filters by zip using $in', () => {
      const params = createPaginateParams<User>()
        .filter('address.zip', inOp(['10001', '10002', '90210']))
        .toParams();

      expect(params['filter.address.zip']).toBe('$in:10001,10002,90210');
    });

    it('filters by city negated (not Berlin)', () => {
      const params = createPaginateParams<User>()
        .filter('address.city', not(eq('Berlin')))
        .toParams();

      expect(params['filter.address.city']).toBe('$not:$eq:Berlin');
    });

    it('filters by multiple address fields simultaneously', () => {
      const params = createPaginateParams<User>()
        .filter('address.city', eq('Berlin'))
        .filter('address.state', eq('BE'))
        .filter('address.zip', eq('10115'))
        .toParams();

      expect(params['filter.address.city']).toBe('$eq:Berlin');
      expect(params['filter.address.state']).toBe('$eq:BE');
      expect(params['filter.address.zip']).toBe('$eq:10115');
    });

    it('removeFilter() clears one address field without affecting others', () => {
      const params = createPaginateParams<User>()
        .filter('address.city', eq('Berlin'))
        .filter('address.state', eq('BE'))
        .removeFilter('address.city')
        .toParams();

      expect(params['filter.address.city']).toBeUndefined();
      expect(params['filter.address.state']).toBe('$eq:BE');
    });

    it('supports to-many quantifier helpers', () => {
      const params = createPaginateParams<User>()
        .filter('courses.courseId', none(eq(1)))
        .toParams();
      expect(params['filter.courses.courseId']).toBe('$none:$eq:1');
    });
  });
});

describe('filter expressions', () => {
  it('stringifies and parses round-trip', () => {
    const expr = and(
      leaf('color', eq('black')),
      or(leaf('name', eq('Milo')), leaf('name', eq('Garfield'))),
    );
    const str = stringifyFilterExpression(expr);
    expect(str).toBe('color=$eq:black AND (name=$eq:Milo OR name=$eq:Garfield)');
    expect(parseFilterExpression(str)).toEqual(expr);
  });

  it('stringifies NOT', () => {
    expect(stringifyFilterExpression(notExpr(leaf('name', eq('Leche'))))).toBe(
      'NOT name=$eq:Leche',
    );
  });
});
