import type { FilterExpression } from './types';

export const DEFAULT_FILTER_EXPRESSION_MAX_COMPLEXITY = 100;

/**
 * Create a leaf term `column=token` for a `filter=` expression.
 */
export const leaf = (column: string, value: string): FilterExpression => ({
  type: 'leaf',
  column,
  value,
});

/**
 * Combine expressions with AND.
 */
export const and = (...children: FilterExpression[]): FilterExpression => {
  if (children.length === 0) {
    throw new Error('and() requires at least one expression');
  }
  if (children.length === 1) {
    return children[0];
  }
  return { type: 'and', children };
};

/**
 * Combine expressions with OR.
 */
export const or = (...children: FilterExpression[]): FilterExpression => {
  if (children.length === 0) {
    throw new Error('or() requires at least one expression');
  }
  if (children.length === 1) {
    return children[0];
  }
  return { type: 'or', children };
};

/**
 * Negate an expression (NOT).
 * Distinct from the token helper `not(token)` which prefixes `$not:`.
 */
export const notExpr = (child: FilterExpression): FilterExpression => ({
  type: 'not',
  child,
});

const quoteValueIfNeeded = (value: string): string => {
  if (/[\s()]/.test(value) || /^(AND|OR|NOT)$/i.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
};

/**
 * Serialize a {@link FilterExpression} AST to the nestjs-paginate `filter=` string.
 */
export const stringifyFilterExpression = (node: FilterExpression, parentPrec = 0): string => {
  switch (node.type) {
    case 'leaf': {
      return `${node.column}=${quoteValueIfNeeded(node.value)}`;
    }
    case 'not': {
      const child = node.child;
      const childStr = stringifyFilterExpression(child, 0);
      const wrapped = child.type === 'and' || child.type === 'or' ? `(${childStr})` : childStr;
      return `NOT ${wrapped}`;
    }
    case 'and': {
      const joined = node.children.map((c) => stringifyFilterExpression(c, 2)).join(' AND ');
      return parentPrec > 2 ? `(${joined})` : joined;
    }
    case 'or': {
      const joined = node.children.map((c) => stringifyFilterExpression(c, 1)).join(' OR ');
      return parentPrec > 1 ? `(${joined})` : joined;
    }
  }
};

type Token =
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'and' }
  | { type: 'or' }
  | { type: 'not' }
  | { type: 'leaf'; raw: string };

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (WHITESPACE.has(c)) {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    let raw = '';
    let quoted = false;
    while (i < input.length) {
      const ch = input[i];
      if (WHITESPACE.has(ch) || ch === '(' || ch === ')') break;
      if (ch === '"' || ch === "'") {
        quoted = true;
        i++;
        while (i < input.length && input[i] !== ch) {
          if (input[i] === '\\' && i + 1 < input.length) {
            const next = input[i + 1];
            if (next === '"' || next === "'" || next === '\\') {
              raw += next;
              i += 2;
              continue;
            }
          }
          raw += input[i];
          i++;
        }
        if (i >= input.length) {
          throw new Error('Unterminated quote in filter expression');
        }
        i++;
        continue;
      }
      raw += ch;
      i++;
    }

    if (!quoted) {
      const keyword = raw.toUpperCase();
      if (keyword === 'AND' || keyword === 'OR' || keyword === 'NOT') {
        tokens.push({ type: keyword.toLowerCase() as 'and' | 'or' | 'not' });
        continue;
      }
    }
    tokens.push({ type: 'leaf', raw });
  }
  return tokens;
};

const parseTokens = (tokens: Token[], maxComplexity: number): FilterExpression => {
  let pos = 0;
  const peek = () => tokens[pos];

  let complexity = 0;
  const spend = () => {
    if (++complexity > maxComplexity) {
      throw new Error(`Filter expression is too complex (max ${maxComplexity} nodes)`);
    }
  };

  const parseOr = (): FilterExpression => {
    const children = [parseAnd()];
    while (peek()?.type === 'or') {
      pos++;
      spend();
      children.push(parseAnd());
    }
    return children.length === 1 ? children[0] : { type: 'or', children };
  };

  const parseAnd = (): FilterExpression => {
    const children = [parseNot()];
    while (peek()?.type === 'and') {
      pos++;
      spend();
      children.push(parseNot());
    }
    return children.length === 1 ? children[0] : { type: 'and', children };
  };

  const parseNot = (): FilterExpression => {
    if (peek()?.type === 'not') {
      pos++;
      spend();
      return { type: 'not', child: parseNot() };
    }
    return parsePrimary();
  };

  const parsePrimary = (): FilterExpression => {
    const token = peek();
    if (!token) {
      throw new Error('Unexpected end of filter expression');
    }
    if (token.type === 'lparen') {
      pos++;
      spend();
      const expr = parseOr();
      if (peek()?.type !== 'rparen') {
        throw new Error('Expected ")" in filter expression');
      }
      pos++;
      return expr;
    }
    if (token.type === 'leaf') {
      pos++;
      spend();
      const eqIdx = token.raw.indexOf('=');
      if (eqIdx < 1) {
        throw new Error(`Invalid filter expression term "${token.raw}", expected "column=value"`);
      }
      return { type: 'leaf', column: token.raw.slice(0, eqIdx), value: token.raw.slice(eqIdx + 1) };
    }
    throw new Error(`Unexpected "${token.type}" in filter expression`);
  };

  if (tokens.length === 0) {
    throw new Error('Empty filter expression');
  }
  const expr = parseOr();
  if (pos < tokens.length) {
    throw new Error('Unexpected trailing tokens in filter expression');
  }
  return expr;
};

/**
 * Parse a nestjs-paginate `filter=` expression string into an AST.
 */
export const parseFilterExpression = (
  input: string,
  maxComplexity: number = DEFAULT_FILTER_EXPRESSION_MAX_COMPLEXITY,
): FilterExpression => {
  return parseTokens(tokenize(input), maxComplexity);
};
