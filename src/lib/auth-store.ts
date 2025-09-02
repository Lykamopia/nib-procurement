
import type { User } from './types';

let userList: User[] = [];

// Function to get the initial set of users
function getInitialUsers(): User[] {
  return [
    { id: '1', name: 'Alice', email: 'alice@example.com', password: 'password123', role: 'Requester' },
    { id: '2', name: 'Bob', email: 'bob@example.com', password: 'password123', role: 'Approver' },
    { id: '3', name: 'Charlie', email: 'charlie@example.com', password: 'password123', role: 'Procurement Officer' },
    { id: '4', name: 'David', email: 'david@example.com', password: 'password123', role: 'Receiving' },
    { id: '5', name: 'Eve', email: 'eve@example.com', password: 'password123', role: 'Finance' },
    { id: 'VENDOR-001', name: 'Apple Inc.', email: 'vendor@apple.com', password: 'password123', role: 'Vendor' },
    { id: 'VENDOR-002', name: 'Dell Technologies', email: 'vendor@dell.com', password: 'password123', role: 'Vendor' },
  ];
}

// Function to seed or reset the users in memory
export function seedInitialUsers() {
  userList = getInitialUsers();
}

// Initialize the user list when the module is first loaded
seedInitialUsers();

// Export the live list
export const users = userList;
