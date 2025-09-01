
import type { User } from './types';

// In-memory user store
export const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', password: 'password123', role: 'Requester' },
  { id: '2', name: 'Bob', email: 'bob@example.com', password: 'password123', role: 'Approver' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', password: 'password123', role: 'Procurement Officer' },
  { id: '4', name: 'David', email: 'david@example.com', password: 'password123', role: 'Receiving' },
];
