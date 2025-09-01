import type { User } from './types';

// In-memory user store
const users: User[] = [
  { id: '1', name: 'Alice (Requester)', email: 'alice@example.com', password: 'password123' },
  { id: '2', name: 'Bob (Approver)', email: 'bob@example.com', password: 'password123' },
  { id: '3', name: 'Charlie (Procurement)', email: 'charlie@example.com', password: 'password123' },
];

export async function login(email: string, password: string): Promise<{ user: User; token: string } | null> {
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    // In a real app, generate a proper JWT.
    // Here, we just create a mock token.
    const mockToken = `mock-token-for-${user.id}-${Date.now()}`;
    return { user, token: mockToken };
  }
  return null;
}

export async function register(name: string, email: string, password: string): Promise<{ user: User; token: string } | null> {
  if (users.some((u) => u.email === email)) {
    return null; // User already exists
  }
  const newUser: User = {
    id: String(users.length + 1),
    name,
    email,
    password,
  };
  users.push(newUser);
  const mockToken = `mock-token-for-${newUser.id}-${Date.now()}`;
  return { user: newUser, token: mockToken };
}

export async function getUserByToken(token: string): Promise<User | null> {
    if (!token.startsWith('mock-token-for-')) return null;

    const parts = token.split('-');
    const userId = parts[3];
    const user = users.find(u => u.id === userId);

    return user || null;
}
