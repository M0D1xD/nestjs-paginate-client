import type { PaginateQueryBuilder } from './builder';
import { fromQueryString, fromUrl } from './parse';
import type { PaginatedLinks } from './types';

export interface ParsedPaginatedLinks<T extends Record<string, unknown> = Record<string, unknown>> {
  first?: PaginateQueryBuilder<T>;
  previous?: PaginateQueryBuilder<T>;
  current: PaginateQueryBuilder<T>;
  next?: PaginateQueryBuilder<T>;
  last?: PaginateQueryBuilder<T>;
}

/**
 * Parse nestjs-paginate `links` into builders for navigation (load more / prev / next).
 */
export const parsePaginatedLinks = <T extends Record<string, unknown> = Record<string, unknown>>(
  links: PaginatedLinks,
): ParsedPaginatedLinks<T> => {
  const parseOptional = (href?: string): PaginateQueryBuilder<T> | undefined => {
    if (!href) {
      return undefined;
    }
    return fromUrl<T>(href);
  };

  return {
    first: parseOptional(links.first),
    previous: parseOptional(links.previous),
    current: fromUrl<T>(links.current),
    next: parseOptional(links.next),
    last: parseOptional(links.last),
  };
};

/**
 * Convenience: build the next-page query string from a response `links.next` URL, if present.
 */
export const nextPageQueryString = (links: PaginatedLinks): string | undefined => {
  if (!links.next) {
    return undefined;
  }
  return fromUrl(links.next).toQueryString();
};

/**
 * Extract the query portion from a link URL as a builder (alias of {@link fromUrl}).
 */
export const fromLink = fromUrl;

/** Re-export for consumers who only need query parsing helpers. */
export { fromQueryString, fromUrl };
