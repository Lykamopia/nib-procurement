
import type { User } from './types';
import { users as userList } from './data-store';

// This function is for seeding the initial users which is now handled by data-store.
export function seedInitialUsers() {
  // This function is intentionally left empty as user seeding is now centralized
  // in data-store.ts to ensure data consistency.
}


// Export the live list from the central data store
export const users = userList;

userList.find(u => u.id === '6')!.email = 'tade2024bdu@gmail.com';
