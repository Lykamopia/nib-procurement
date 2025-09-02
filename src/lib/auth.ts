
import type { User, UserRole } from './types';
import { users } from './auth-store';

export async function login(email: string, password: string): Promise<{ user: User; token: string; role: UserRole } | null> {
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    // In a real app, generate a proper JWT.
    // Here, we just create a mock token.
    const mockToken = `mock-token-for-${user.id}__ROLE__${user.role}__TS__${Date.now()}`;
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token: mockToken, role: user.role };
  }
  return null;
}

export async function register(name: string, email: string, password: string, role: UserRole): Promise<{ user: User; token: string; role: UserRole } | null> {
  if (users.some((u) => u.email === email)) {
    return null; // User already exists
  }
  const newUser = {
    id: role === 'Vendor' ? `VENDOR-${Date.now()}` : String(users.length + 1),
    name,
    email,
    password,
    role,
  };
  users.push(newUser);
  const mockToken = `mock-token-for-${newUser.id}__ROLE__${newUser.role}__TS__${Date.now()}`;
  const { password: _, ...userWithoutPassword } = newUser;
  return { user: userWithoutPassword, token: mockToken, role: newUser.role };
}

export async function getUserByToken(token: string): Promise<{ user: User, role: UserRole } | null> {
    if (!token.startsWith('mock-token-for-')) return null;

    try {
        const tokenContent = token.substring('mock-token-for-'.length);
        const [userId, rolePart] = tokenContent.split('__ROLE__');
        const [userRole] = rolePart.split('__TS__');
        
        const user = users.find(u => u.id === userId);

        if (user && user.role === userRole) {
          const { password, ...userWithoutPassword } = user;
          return { user: userWithoutPassword, role: user.role as UserRole };
        }
    } catch(e) {
        console.error("Failed to parse token:", e);
        return null;
    }


    return null;
}
