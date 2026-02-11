import { describe, it, expect } from 'vitest';
import {
  buildFilterToken,
  eq,
  gte,
  gt,
  lt,
  lte,
  inOp,
  nullOp,
  btw,
  ilike,
  sw,
  contains,
  not,
  or,
} from './filter';
import { FilterOperator, FilterComparator, FilterSuffix } from './types';

describe('buildFilterToken', () => {
  it('builds $eq:value', () => {
    expect(buildFilterToken({ operator: FilterOperator.EQ, value: 'John' })).toBe('$eq:John');
    expect(buildFilterToken({ operator: FilterOperator.EQ, value: 5 })).toBe('$eq:5');
  });

  it('builds $null without value', () => {
    expect(buildFilterToken({ operator: FilterOperator.NULL })).toBe('$null');
  });

  it('builds $gte:value', () => {
    expect(buildFilterToken({ operator: FilterOperator.GTE, value: 3 })).toBe('$gte:3');
  });

  it('builds $in with comma-separated value', () => {
    expect(buildFilterToken({ operator: FilterOperator.IN, value: 'a,b,c' })).toBe('$in:a,b,c');
  });

  it('builds $btw with two numbers', () => {
    expect(buildFilterToken({ operator: FilterOperator.BTW, value: [1, 10] })).toBe('$btw:1,10');
  });

  it('builds with comparator $or', () => {
    expect(
      buildFilterToken({
        comparator: FilterComparator.OR,
        operator: FilterOperator.EQ,
        value: 'foo',
      }),
    ).toBe('$or:$eq:foo');
  });

  it('builds with suffix $not', () => {
    expect(
      buildFilterToken({
        suffix: FilterSuffix.NOT,
        operator: FilterOperator.EQ,
        value: 'x',
      }),
    ).toBe('$not:$eq:x');
  });
});

describe('filter helpers', () => {
  it('eq()', () => {
    expect(eq('John')).toBe('$eq:John');
    expect(eq(42)).toBe('$eq:42');
  });

  it('gte()', () => {
    expect(gte(3)).toBe('$gte:3');
  });

  it('gt(), lt(), lte()', () => {
    expect(gt(5)).toBe('$gt:5');
    expect(lt(10)).toBe('$lt:10');
    expect(lte(7)).toBe('$lte:7');
  });

  it('inOp()', () => {
    expect(inOp([1, 2, 3])).toBe('$in:1,2,3');
    expect(inOp(['a', 'b'])).toBe('$in:a,b');
  });

  it('nullOp()', () => {
    expect(nullOp()).toBe('$null');
  });

  it('btw()', () => {
    expect(btw(4, 5)).toBe('$btw:4,5');
  });

  it('ilike() and sw()', () => {
    expect(ilike('john')).toBe('$ilike:john');
    expect(sw('Ga')).toBe('$sw:Ga');
  });

  it('contains()', () => {
    expect(contains([1, 2])).toBe('$contains:1,2');
  });

  it('not()', () => {
    expect(not(eq('x'))).toBe('$not:$eq:x');
    expect(not(inOp([1, 2]))).toBe('$not:$in:1,2');
  });

  it('or()', () => {
    expect(or(eq('foo'))).toBe('$or:$eq:foo');
  });
});
