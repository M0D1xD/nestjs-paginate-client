import type { PaginatedResponse, PaginateQueryBuilder } from 'nestjs-paginate-client';
import type { User } from './data';
import { paginateUsers } from './paginate';

const LATENCY_MS = 350;

/**
 * Stand-in for the real HTTP call. Against a real nestjs-paginate backend this is just:
 *
 *   const res = await fetch(`https://api.example.com/users${builder.toQueryString()}`);
 *   return (await res.json()) as PaginatedResponse<User>;
 */
export const fetchUsers = async (
  query: PaginateQueryBuilder<User> | string,
): Promise<PaginatedResponse<User>> => {
  const queryString = typeof query === 'string' ? query : query.toQueryString();
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  return paginateUsers(queryString);
};
