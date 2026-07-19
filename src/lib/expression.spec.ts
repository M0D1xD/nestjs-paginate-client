import { describe, expect, it } from 'vitest';
import {
  and,
  leaf,
  notExpr,
  or,
  parseFilterExpression,
  stringifyFilterExpression,
} from './expression';
import { eq, gte } from './filter';

describe('stringifyFilterExpression / parseFilterExpression', () => {
  it('parses simple leaf', () => {
    expect(parseFilterExpression('color=$eq:black')).toEqual(leaf('color', eq('black')));
  });

  it('parses AND / OR with precedence', () => {
    const expr = parseFilterExpression('color=$eq:black AND age=$gte:3 OR name=$eq:Milo');
    expect(expr).toEqual(
      or(and(leaf('color', eq('black')), leaf('age', gte(3))), leaf('name', eq('Milo'))),
    );
    expect(stringifyFilterExpression(expr)).toBe('color=$eq:black AND age=$gte:3 OR name=$eq:Milo');
  });

  it('parses parentheses and NOT', () => {
    const expr = parseFilterExpression(
      '(color=$eq:black OR color=$eq:white) AND NOT name=$eq:Leche',
    );
    expect(expr).toEqual(
      and(
        or(leaf('color', eq('black')), leaf('color', eq('white'))),
        notExpr(leaf('name', eq('Leche'))),
      ),
    );
  });

  it('round-trips complex expression', () => {
    const original = and(
      leaf('color', eq('black')),
      or(leaf('age', gte(3)), notExpr(leaf('name', eq('Leche')))),
    );
    const str = stringifyFilterExpression(original);
    expect(parseFilterExpression(str)).toEqual(original);
  });

  it('quotes values with spaces', () => {
    const str = stringifyFilterExpression(leaf('name', eq('John Doe')));
    expect(str).toBe('name="$eq:John Doe"');
    expect(parseFilterExpression(str)).toEqual(leaf('name', eq('John Doe')));
  });

  it('rejects empty expression', () => {
    expect(() => parseFilterExpression('')).toThrow('Empty filter expression');
  });
});
