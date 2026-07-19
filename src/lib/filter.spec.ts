import { describe, expect, it } from 'vitest';
import {
  all,
  any,
  btw,
  buildFilterToken,
  contains,
  eq,
  gt,
  gte,
  ilike,
  inOp,
  lt,
  lte,
  none,
  not,
  nullOp,
  sw,
} from './filter';
import { FilterOperator, FilterQuantifier, FilterSuffix } from './types';

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

  it('builds with quantifier $all', () => {
    expect(
      buildFilterToken({
        quantifier: FilterQuantifier.ALL,
        operator: FilterOperator.EQ,
        value: 'foo',
      }),
    ).toBe('$all:$eq:foo');
  });

  it('omits $any quantifier (default)', () => {
    expect(
      buildFilterToken({
        quantifier: FilterQuantifier.ANY,
        operator: FilterOperator.EQ,
        value: 'foo',
      }),
    ).toBe('$eq:foo');
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

  it('throws when non-null operator receives no value', () => {
    expect(() => buildFilterToken({ operator: FilterOperator.EQ })).toThrow(
      'Filter operator "$eq" requires a value, but none was provided.',
    );
    expect(() => buildFilterToken({ operator: FilterOperator.GTE })).toThrow();
  });

  it('throws when array value is empty', () => {
    expect(() => buildFilterToken({ operator: FilterOperator.IN, value: [] })).toThrow(
      'Filter operator "$in" requires a non-empty value list.',
    );
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
    expect(() => inOp([])).toThrow();
  });

  it('nullOp()', () => {
    expect(nullOp()).toBe('$null');
  });

  it('btw()', () => {
    expect(btw(4, 5)).toBe('$btw:4,5');
    expect(btw('2022-02-02', '2022-02-10')).toBe('$btw:2022-02-02,2022-02-10');
  });

  it('ilike() and sw()', () => {
    expect(ilike('john')).toBe('$ilike:john');
    expect(sw('Ga')).toBe('$sw:Ga');
  });

  it('contains() variadic', () => {
    expect(contains(1, 2)).toBe('$contains:1,2');
    expect(contains('a', 'b', 'c')).toBe('$contains:a,b,c');
    expect(() => contains()).toThrow();
  });

  it('not()', () => {
    expect(not(eq('x'))).toBe('$not:$eq:x');
    expect(not(inOp([1, 2]))).toBe('$not:$in:1,2');
    expect(not(nullOp())).toBe('$not:$null');
  });

  it('any(), all(), none()', () => {
    expect(any(eq('Ball'))).toBe('$any:$eq:Ball');
    expect(all(eq('Ball'))).toBe('$all:$eq:Ball');
    expect(none(eq('Ball'))).toBe('$none:$eq:Ball');
  });
});
