/**
 * In-memory dataset for the mock backend. In a real app these rows live in your
 * database behind a NestJS + nestjs-paginate endpoint.
 */
export type Address = {
  city: string;
  country: string;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  createdAt: string;
  address: Address;
};

const FIRST_NAMES = [
  'Ada',
  'Alan',
  'Grace',
  'Linus',
  'Margaret',
  'Dennis',
  'Barbara',
  'Ken',
  'Radia',
  'Donald',
  'Hedy',
  'Edsger',
  'Katherine',
  'John',
  'Frances',
  'Tim',
];

const LAST_NAMES = [
  'Lovelace',
  'Turing',
  'Hopper',
  'Hamilton',
  'Ritchie',
  'Liskov',
  'Thompson',
  'Perlman',
  'Knuth',
  'Lamarr',
  'Dijkstra',
  'Johnson',
];

const CITIES: [string, string][] = [
  ['Berlin', 'Germany'],
  ['Amsterdam', 'Netherlands'],
  ['Lisbon', 'Portugal'],
  ['Austin', 'USA'],
  ['Tokyo', 'Japan'],
  ['Cairo', 'Egypt'],
  ['Oslo', 'Norway'],
  ['Toronto', 'Canada'],
];

const ROLES = ['admin', 'editor', 'viewer'] as const;

/** Deterministic pseudo-random dataset — same 137 users on every reload. */
export const USERS: User[] = Array.from({ length: 137 }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length];
  const [city, country] = CITIES[(i * 5) % CITIES.length];

  return {
    id: i + 1,
    firstName,
    lastName,
    email: `${firstName}.${lastName}.${i + 1}@example.com`.toLowerCase(),
    age: 19 + ((i * 13) % 46),
    role: ROLES[(i * 11) % ROLES.length],
    isActive: i % 4 !== 0,
    createdAt: new Date(Date.UTC(2024, i % 24, (i % 27) + 1, 12)).toISOString(),
    address: { city, country },
  };
});
